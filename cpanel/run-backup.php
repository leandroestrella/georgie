<?php
/**
 * Georgie — catalog spreadsheet backup cron job.
 *
 * Runs from a cPanel cron job (`php .../run-backup.php`), never over HTTP —
 * the guard below refuses any real web request outright. It checks for
 * $_SERVER['REQUEST_METHOD'] rather than PHP_SAPI === 'cli': some cPanel
 * setups (PHP Selector/MultiPHP) run cron's `php` command through a
 * CGI-flavored binary rather than a true CLI one, which reports a SAPI name
 * other than "cli" even for a legitimate cron invocation — REQUEST_METHOD is
 * only ever set by an actual web server handling an actual HTTP request, so
 * it's the portable signal regardless of which SAPI cron happens to use
 * (this exact pitfall was hit and fixed while building the same feature in
 * linkulino — see docs/backups.md).
 *
 * Pulls the sheet FROM Google rather than having Apps Script push it here:
 * linkulino's identical push design (Apps Script POSTing to a receiving
 * endpoint) hit a wall on this same hosting — an inbound WAF blocked every
 * request from Google's servers with a 403, regardless of payload shape,
 * with no configurable exception available from the cPanel account. Pulling
 * sidesteps it entirely: this script reaches out to Google, nothing from
 * Google reaches in, so there's no inbound request for a WAF to block.
 *
 * Setup (see docs/backups.md):
 *   1. Copy this file into the georgie docroot, same as cpanel/upload-cover.php.
 *   2. Create a Google service account with Viewer access to the spreadsheet,
 *      and a private/ folder next to this script (see docs/backups.md for
 *      the .htaccess deny-all that keeps it unservable) holding
 *      georgie-backup-config.php with its credentials.
 *   3. Add a cPanel Cron Job running `php .../run-backup.php` daily.
 *
 * Auth: a Google service account, not the app's own OAuth sign-in — a
 * service account's key-based auth doesn't carry the "testing app" 7-day
 * refresh-token expiry that would otherwise silently break an unattended
 * job after a week. It only needs Viewer access to the one spreadsheet,
 * granted by sharing it with the service account's email like any other
 * collaborator.
 *
 * Config (spreadsheet id, service account credentials, backups directory,
 * retention counts) lives in a file this script doesn't ship and git never
 * sees — created once by hand, the same way apps-script/.clasp.json holds
 * per-instance values that never get committed. Accepts the config
 * filename as an optional first argument (defaults to
 * georgie-backup-config.php) so one script can serve dev and prod with two
 * separate cron entries.
 */

if (isset($_SERVER['REQUEST_METHOD'])) {
    http_response_code(403);
    exit("This script only runs from cron, not the web.\n");
}

$configFilename = isset($argv[1]) && $argv[1] !== '' ? basename($argv[1]) : 'georgie-backup-config.php';
$configPath = __DIR__ . '/private/' . $configFilename;
if (!is_file($configPath)) {
    fwrite(STDERR, "Backup not configured — missing $configPath\n");
    exit(1);
}
$config = require $configPath;

try {
    $jwt = georgie_build_service_account_jwt(
        (string) $config['serviceAccountEmail'],
        (string) $config['serviceAccountPrivateKey'],
        'https://www.googleapis.com/auth/drive.readonly',
    );
    $accessToken = georgie_fetch_access_token($jwt);
    $xlsx = georgie_export_spreadsheet($accessToken, (string) $config['spreadsheetId']);
} catch (Throwable $e) {
    fwrite(STDERR, 'Backup failed: ' . $e->getMessage() . "\n");
    exit(1);
}

$backupsDir = rtrim((string) $config['backupsDir'], '/');
if (!is_dir($backupsDir) && !mkdir($backupsDir, 0700, true) && !is_dir($backupsDir)) {
    fwrite(STDERR, "Cannot create backups directory: $backupsDir\n");
    exit(1);
}

$filename = 'backup-' . gmdate('Y-m-d_His') . '.xlsx';
$path = $backupsDir . '/' . $filename;

// Write via a temp file + rename so a run that dies mid-write never leaves a
// half-written file for the retention sweep below to count.
$tmpPath = $path . '.part';
if (file_put_contents($tmpPath, $xlsx) === false || !rename($tmpPath, $path)) {
    @unlink($tmpPath);
    fwrite(STDERR, "Failed to write backup file\n");
    exit(1);
}

$dailyKeep = (int) ($config['dailyKeep'] ?? 14);
$monthlyKeep = (int) ($config['monthlyKeep'] ?? 6);
$deleted = georgie_apply_backup_retention($backupsDir, $dailyKeep, $monthlyKeep);

echo 'Backup stored: ' . $filename . (count($deleted) > 0 ? ' (deleted: ' . implode(', ', $deleted) . ')' : '') . "\n";

/** Base64url — RFC 4648 §5, no padding, used throughout the JWT below. */
function georgie_base64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Builds and RS256-signs a service-account JWT assertion (RFC 7523) for the
 * given scope, valid for one hour. $privateKeyPem is the PEM string from the
 * service account's downloaded JSON key ("private_key" field).
 */
function georgie_build_service_account_jwt(string $serviceAccountEmail, string $privateKeyPem, string $scope): string
{
    $now = time();
    $segments = [
        georgie_base64url_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])),
        georgie_base64url_encode(json_encode([
            'iss' => $serviceAccountEmail,
            'scope' => $scope,
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ])),
    ];
    $signingInput = implode('.', $segments);
    $signature = '';
    if (!openssl_sign($signingInput, $signature, $privateKeyPem, 'sha256WithRSAEncryption')) {
        throw new RuntimeException('Failed to sign JWT — check the service account private key in the config file');
    }
    $segments[] = georgie_base64url_encode($signature);
    return implode('.', $segments);
}

/** Exchanges a signed JWT assertion for a short-lived Google API access token. */
function georgie_fetch_access_token(string $jwt): string
{
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    if ($response === false) {
        throw new RuntimeException('Token exchange request failed: ' . $curlError);
    }
    if ($status !== 200) {
        throw new RuntimeException('Token exchange failed: HTTP ' . $status . ' ' . $response);
    }
    $data = json_decode((string) $response, true);
    if (!is_array($data) || !isset($data['access_token'])) {
        throw new RuntimeException('Token exchange response missing access_token: ' . $response);
    }
    return (string) $data['access_token'];
}

/** Exports the given spreadsheet as XLSX via the Drive API, using a Bearer access token. */
function georgie_export_spreadsheet(string $accessToken, string $spreadsheetId): string
{
    $url = 'https://www.googleapis.com/drive/v3/files/' . rawurlencode($spreadsheetId)
        . '/export?mimeType=' . rawurlencode('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $accessToken],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
    ]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    if ($body === false) {
        throw new RuntimeException('Spreadsheet export request failed: ' . $curlError);
    }
    if ($status !== 200) {
        throw new RuntimeException('Spreadsheet export failed: HTTP ' . $status . ' ' . $body);
    }
    return (string) $body;
}

/**
 * Keeps the most recent $dailyKeep backups unconditionally, then one backup
 * per calendar month for up to $monthlyKeep further months back; deletes
 * everything else. Returns the deleted filenames.
 * @return string[]
 */
function georgie_apply_backup_retention(string $dir, int $dailyKeep, int $monthlyKeep): array
{
    $files = glob($dir . '/backup-*.xlsx');
    if ($files === false) {
        return [];
    }
    // Filenames are backup-YYYY-MM-DD_HHMMSS.xlsx, so a plain string sort is
    // already newest-first once reversed.
    rsort($files);

    $keep = array_flip(array_slice($files, 0, $dailyKeep));
    $monthsSeen = [];
    foreach (array_slice($files, $dailyKeep) as $file) {
        if (!preg_match('/backup-(\d{4}-\d{2})-\d{2}_\d{6}\.xlsx$/', basename($file), $m)) {
            continue;
        }
        $month = $m[1];
        if (isset($monthsSeen[$month]) || count($monthsSeen) >= $monthlyKeep) {
            continue;
        }
        $monthsSeen[$month] = true;
        $keep[$file] = true;
    }

    $deleted = [];
    foreach ($files as $file) {
        if (!isset($keep[$file])) {
            @unlink($file);
            $deleted[] = basename($file);
        }
    }
    return $deleted;
}
