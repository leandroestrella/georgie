<?php
/**
 * Georgie — cover upload receiver for cPanel hosting.
 *
 * Stores book cover images that an admin saves from the app, so covers live on
 * infrastructure you control instead of rotting external sources. It is called
 * ONLY by the Apps Script backend (never the browser directly), which holds the
 * shared secret and has already verified the admin — so this endpoint just checks
 * the secret, validates the image, and writes the file.
 *
 * Setup (see cpanel/README.md):
 *   1. Copy this file into the georgie docroot as `upload-cover.php`.
 *   2. Set UPLOAD_SECRET below (or via the COVER_UPLOAD_SECRET env var) to a long
 *      random string; put the SAME value in the Apps Script Script Property
 *      `COVERS_UPLOAD_SECRET`.
 *   3. The covers land in `covers/<id>.<ext>` next to this script and are served
 *      at `https://<your-host>/covers/<id>.<ext>`.
 *
 * Request: POST multipart/form-data
 *   header  X-Upload-Secret: <secret>
 *   field   id:   the book id (call number, e.g. ORW-198-1950)
 *   file    file: the image (jpeg/png/webp)
 * Response: JSON { "ok": true, "url": "https://.../covers/<id>.<ext>" }
 */

header('Content-Type: application/json');

// The secret: prefer an env var so it need not be edited into this file.
$SECRET = getenv('COVER_UPLOAD_SECRET') ?: 'REPLACE_WITH_A_LONG_RANDOM_SECRET';
$MAX_BYTES = 10 * 1024 * 1024; // 10 MB
$ALLOWED = array('image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp');

function fail($code, $msg) {
  http_response_code($code);
  echo json_encode(array('ok' => false, 'error' => $msg));
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail(405, 'POST only');

// Constant-time secret check.
$given = isset($_SERVER['HTTP_X_UPLOAD_SECRET']) ? $_SERVER['HTTP_X_UPLOAD_SECRET'] : '';
if ($SECRET === 'REPLACE_WITH_A_LONG_RANDOM_SECRET' || !hash_equals($SECRET, $given)) {
  fail(401, 'bad secret');
}

// Book id → safe filename (call numbers are [A-Z0-9-] plus optional -2 suffixes).
$id = isset($_POST['id']) ? trim($_POST['id']) : '';
if (!preg_match('/^[A-Za-z0-9._-]{1,64}$/', $id)) fail(400, 'bad id');

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) fail(400, 'no file');
if ($_FILES['file']['size'] > $MAX_BYTES) fail(413, 'too large');

$tmp = $_FILES['file']['tmp_name'];

// Validate it is really an image (not a script with an image name).
$info = @getimagesize($tmp);
if ($info === false) fail(415, 'not an image');
$mime = $info['mime'];
if (!isset($ALLOWED[$mime])) fail(415, 'unsupported type');
$ext = $ALLOWED[$mime];

$dir = __DIR__ . '/covers';
if (!is_dir($dir) && !mkdir($dir, 0755, true)) fail(500, 'mkdir failed');

// Defence-in-depth: never let anything in covers/ be executed as a script.
$ht = $dir . '/.htaccess';
if (!is_file($ht)) {
  @file_put_contents($ht, "php_flag engine off\nRemoveHandler .php .phtml .php3 .php4 .php5 .php7 .cgi\nSetHandler none\n");
}

// Drop any prior variant for this id so a re-upload never leaves a stale file.
foreach ($ALLOWED as $e) {
  $old = $dir . '/' . $id . '.' . $e;
  if (is_file($old)) @unlink($old);
}

$dest = $dir . '/' . $id . '.' . $ext;
if (!move_uploaded_file($tmp, $dest)) fail(500, 'write failed');
@chmod($dest, 0644);

// Absolute URL of the stored file, derived from this script's own location.
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'];
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$url = $scheme . '://' . $host . $base . '/covers/' . $id . '.' . $ext;

echo json_encode(array('ok' => true, 'url' => $url));
