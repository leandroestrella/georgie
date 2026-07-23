# Cover hosting on cPanel

Lets a signed-in admin **save a book's cover to your own host** (instead of
depending on external sources that rot) — either by snapshotting the cover the
app currently shows, or by uploading a photo of the physical book. The saved URL
is written back into the sheet's `Cover URL` column.

```
browser (admin)  ──▶  Apps Script (admin-gated)  ──▶  upload-cover.php (secret)  ──▶  covers/<id>.jpg
                         writes Cover URL ◀───────────── returns the public URL
```

The browser never talks to the PHP endpoint directly and never holds the secret —
Apps Script does, after it has verified the admin.

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
- **In Apps Script** — Project Settings → Script Properties → `COVERS_UPLOAD_SECRET`.

### 3. Point Apps Script at the endpoint
Add one more Script Property:

- `COVERS_UPLOAD_URL` = `https://<your-host>/upload-cover.php`

### 4. Deploy the backend
The `saveCover` action needs to be live:

```bash
cd apps-script
npm run push
npx clasp deploy -i <dev deploymentId>     # then the prod id when going live
```

No re-authorization is needed — `saveCover` uses `UrlFetchApp`, which the token
verifier already uses.

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
  It lives on the host and in Script Properties — never in the repo or the client.
