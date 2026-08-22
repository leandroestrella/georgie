# spreadsheet backups

The Google Sheet is the only copy of your catalog — no snapshotting
otherwise. A cPanel **cron job** runs a PHP script daily that exports it to
XLSX and stores it on cPanel, inside the docroot at `private/` but blocked
from ever being served over HTTP — a `.htaccess` deny-all rule inside that
folder, not its position, is what keeps it private — with rotation (last 14
daily + 6 monthly, configurable).

## why a cron *pull*, and why a service account

Georgie already has one cPanel-side PHP endpoint,
[`cpanel/upload-cover.php`](../cpanel/README.md), which works the opposite
way: Apps Script *pushes* a cover image to it. That pattern was
deliberately **not** reused for backups, based on what happened building
the identical feature for [linkulino](../../linkulino) (the sibling
project on the same hosting): an Apps Script time trigger POSTing the
exported sheet to a receiving PHP endpoint here got blocked outright — a
403 on every request from Google's servers, regardless of payload encoding
or `User-Agent`, with no WAF dashboard exposed in that cPanel account to
add an exception. Since georgie shares the same domain and, very likely,
the same hosting account, the same block should be assumed here too unless
proven otherwise.

**Pulling instead of pushing sidesteps the problem entirely** — this
script runs *on* cPanel and reaches out to Google, so there's no inbound
request for a WAF to block, and no public HTTP endpoint at all. (This
doesn't mean `upload-cover.php`'s push is definitely broken the same way —
it's never actually been triggered by Apps Script for real, only tested via
curl, which is exactly the blind spot that hid linkulino's issue. That's a
separate, pre-existing question outside this doc's scope.)

**Auth** is a Google **service account**, not the app's own OAuth sign-in.
An OAuth app left in Google Cloud's "Testing" publish status has refresh
tokens that silently expire after 7 days — exactly wrong for something
meant to run unattended. A service account's key-based auth has no such
expiry. It's a **separate** service account from linkulino's — not shared
— so a leaked key for one project can't reach the other's spreadsheet.

`private/` sits *inside* the docroot rather than one or two directories
above it: a `.htaccess` deny-all works the same regardless of what's above
the docroot, and doesn't depend on figuring out this account's specific
directory nesting. The trade-off: since it's not part of the git-tracked
`web/dist/` build (like `run-backup.php` itself, and like
`upload-cover.php`/`covers/` before it), it has to be explicitly excluded
from the FTP deploy's sync (`.github/workflows/deployTocPanel.yml`'s
`exclude` list) — otherwise the next deploy would see it as removed and
delete it. That exclusion is already in place, covering the backup files
and (newly, while adding this) `upload-cover.php`/`covers/` too, which
turned out to have the same unprotected gap.

## why `run-backup.php` lives in its own `backup/` subfolder

The first live attempt put `run-backup.php` directly at the docroot root
(a sibling of `index.html`), matching `upload-cover.php`'s placement. Every
cron run failed with a bare `Status: 500 Internal Server Error` and an
empty body — not one of this script's own error messages (those all print
something specific; see the troubleshooting list below), meaning PHP never
actually got to execute the script's code at all. linkulino's identical
script, on the same cPanel account, has worked from day one running out of
its own `backup/` subfolder. The likely cause: a per-domain PHP dispatcher
(MultiPHP/PHP-FPM routing, common on cPanel/CloudLinux) can intercept a
script sitting directly in a domain's *registered* docroot and try to route
it as a web request instead of a plain CLI process, dumping raw CGI-style
response headers with nothing behind them — a script one level down in a
subfolder isn't recognized the same way. This is circumstantial (both
projects show the same contrast — subfolder works, docroot root doesn't —
but neither was confirmed against cPanel's own internals), not proven, but
low-risk to just match the working layout rather than dig further. `private/`
itself didn't need to move — the script resolves it via `dirname(__DIR__)`,
a sibling of the docroot, not of `run-backup.php`'s own new folder.

## setup

**1. Create a Google service account.** In [Google Cloud
Console](https://console.cloud.google.com/), in the same project as this
app's OAuth client:
1. **APIs & Services → Library** → search **Google Drive API** → **Enable**
   (needed for a direct API export call; the app's own sign-in flow never
   required this).
2. **IAM & Admin → Service Accounts → Create Service Account.** Name it
   something like `georgie-backup`. No project-level role needed — it only
   ever needs access to one file, granted next.
3. Click into it → **Keys** tab → **Add Key → Create new key → JSON** →
   download it. It contains a `client_email` and a `private_key` — both go
   into the config file below.

**2. Share the spreadsheet with it.** Open the catalog spreadsheet (dev
and/or prod) → **Share** → paste the service account's `client_email`
(looks like `georgie-backup@your-project.iam.gserviceaccount.com`) →
**Viewer** is enough → **Share**.

Get the spreadsheet's id from its URL:
`https://docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`.

**3. Put the script on the host.** Copy
[`cpanel/backup/run-backup.php`](../cpanel/backup/run-backup.php) into a
**`backup/` folder inside the georgie docroot** via SSH or FTP — not the
docroot root itself; see "why `run-backup.php` lives in its own `backup/`
subfolder" above.

**4. Create `private/` and its config**, via File Manager or SFTP, as a
sibling of the `backup/` folder — i.e. at the docroot root, alongside
`index.html`, not inside `backup/`:

```apache
# private/.htaccess — blocks every request under this folder, whatever the
# filename, regardless of Apache version.
<IfModule mod_authz_core.c>
  Require all denied
</IfModule>
<IfModule !mod_authz_core.c>
  Order deny,allow
  Deny from all
</IfModule>
```

```php
<?php
// docroot/private/georgie-backup-config.php
return [
  'spreadsheetId' => 'PASTE_THE_SPREADSHEET_ID_FROM_STEP_2',
  'serviceAccountEmail' => 'georgie-backup@your-project.iam.gserviceaccount.com',
  'serviceAccountPrivateKey' => "-----BEGIN PRIVATE KEY-----\nPASTE...\n-----END PRIVATE KEY-----\n",
  'backupsDir' => '/full/path/to/docroot/private/backups', // created automatically if missing; use the absolute path cPanel shows for this subdomain's docroot
  'dailyKeep' => 14,
  'monthlyKeep' => 6,
];
```

The `private_key` field from the downloaded JSON pastes in as-is, quotes
and all — its `\n` sequences stay literal backslash-n inside a PHP
double-quoted string, which PHP reads back as real newlines, same as the
JSON did. Keep this file out of git, same as every other credential in
this project — it holds a real private key, not just a shared secret.

Running both a dev and a prod backup on this one cPanel account (there's
no separate "prod cPanel" — prod is just a different spreadsheet)? Use two
config files (e.g. `georgie-backup-config-dev.php` /
`georgie-backup-config-prod.php`, each with its own `backupsDir`) and pass
the filename as the script's first argument — see step 6.

> ✅ **Check the config parses and the folder is locked down**, before
> wiring up cron:
> ```bash
> curl -s https://<subdomain>/private/georgie-backup-config.php
> # should NOT return the file's contents — confirms .htaccess is blocking it
> curl -s https://<subdomain>/backup/run-backup.php
> # "This script only runs from cron, not the web." — confirms the CLI guard
> ```

**5. Add the cron job.** cPanel → **Cron Jobs** → **Add New Cron Job**:

| field | value |
| --- | --- |
| Minute | `0` |
| Hour | `3` |
| Day/Month/Weekday | `*` |
| Command | `php /full/path/to/docroot/backup/run-backup.php` (append a config filename as a second word to target a specific environment, e.g. `... run-backup.php georgie-backup-config-prod.php`) |

cPanel's Cron Jobs page usually shows which exact `php` command your
account should use (sometimes a full versioned path like
`/usr/local/bin/ea-php82`) — use that if plain `php` doesn't resolve. If
plain `php` *does* resolve but the run still fails with a bare
`Status: 500` and empty output, that's not a `php` binary problem — see
"why `run-backup.php` lives in its own `backup/` subfolder" above.

**6. Test it by hand first** — don't wait for 3am. If you don't have
SSH/Terminal access, set the cron to run every 5 minutes temporarily with
output redirected to a log file inside the already-protected `private/`
folder, so you get fast feedback without needing shell access:

```
*/5 * * * * php /full/path/to/docroot/backup/run-backup.php > /full/path/to/docroot/private/last-run.log 2>&1
```

Wait a few minutes, check `private/last-run.log`:
```
Backup stored: backup-2026-08-21_030000.xlsx
```

Then confirm a real XLSX landed in `private/backups/`, and switch the cron
schedule to the real daily timing (step 5's table). Keeping the `>
last-run.log 2>&1` redirect permanently is a handy "did last night's
backup work" check without digging through cron emails.

If it fails instead, the error tells you which stage broke:
- `"Failed to sign JWT..."` → something's wrong with the private key
  formatting in the config
- `"Token exchange failed: HTTP ..."` → Google rejected the JWT — usually
  a mismatched service account email/key, or the Drive API not enabled yet
- `"Spreadsheet export failed: HTTP ..."` (likely 403/404) → most
  commonly the spreadsheet wasn't actually shared with the service
  account's email, or the id is wrong
