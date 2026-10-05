# Cover hosting on cPanel

Lets a signed-in admin **save a book's cover to your own host** (instead of
depending on external sources that rot) — either by snapshotting the cover the
app currently shows, or by uploading a photo of the physical book. The saved URL
is written back into the sheet's `Cover URL` column.

```
browser (admin)  ──▶  backend (signed-in only)  ──▶  upload-cover.php (secret)  ──▶  covers/<id>.jpg
                         saves Cover URL ◀───────────── returns the public URL
```

The browser never talks to the PHP endpoint directly and never holds the secret —
the backend (the Worker in [`server/`](../server/README.md)) does, after it has
checked that the request comes from someone signed in.

This directory also holds [`backup/run-backup.php`](backup/run-backup.php),
the daily spreadsheet-backup cron script — a different setup, and the
opposite data flow (it *pulls* from Google rather than being pushed to), so
it's documented separately in [docs/backups.md](../docs/backups.md).

## One-time setup

### 1. Put the endpoint on the host
Copy [`upload-cover.php`](upload-cover.php) into the **georgie docroot** (same
folder as the app's `index.html`), via SSH or FTP. It creates `covers/` next to
itself on first use. (Uploads are validated as real images and stored with a
forced image extension, so no script can execute from there — and we deliberately
avoid an `.htaccess` in `covers/`, since directives like `php_flag` 500 under
cPanel's PHP-FPM.)

Covers are then served as static files at `https://<your-host>/covers/<id>.jpg`.
The app's existing `.htaccess` serves real files before the SPA fallback, so these
paths resolve; the FTP deploy only syncs `web/dist/`, so it never deletes
`upload-cover.php` or `covers/`.

### 2. Set the shared secret
Pick a long random string. Set it in **two** places to the same value:

- **On the host** — as the `COVER_UPLOAD_SECRET` environment variable (cPanel →
  MultiPHP INI / "Environment Variables"), or, if that's awkward, edit the
  `$SECRET = ...` line in `upload-cover.php`.
- **On the backend** — as the Worker's `COVERS_UPLOAD_SECRET` secret:

  ```bash
  cd server
  npx wrangler secret put COVERS_UPLOAD_SECRET -c wrangler.local.jsonc
  ```

### 3. Point the backend at the endpoint
In `server/wrangler.local.jsonc`, set:

- `COVERS_UPLOAD_URL` = `https://<your-host>/upload-cover.php`

### 4. Deploy the backend

```bash
cd server
npm run deploy
```

## Test it
`curl` a quick check (replace the secret and host):

```bash
curl -F id=TEST-123 -F file=@some-cover.jpg \
  -H "X-Upload-Secret: <secret>" https://<your-host>/upload-cover.php
# → {"ok":true,"url":"https://<your-host>/covers/TEST-123.jpg"}
```

Then open that URL in a browser to confirm the image serves. (Delete the test
file afterwards.)

## Notes
- Accepts JPEG / PNG / WebP, up to 10 MB; the file is validated as a real image.
- Re-saving a book replaces its cover file; the app appends a `?v=` cache-buster
  so the new image shows immediately.
- The secret is the only gate on the PHP endpoint, so keep it long and private.
  It lives on the host and among the Worker's secrets — never in the repo or the client.
