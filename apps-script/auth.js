/**
 * Georgie — pure authorization logic (framework-free, no UrlFetchApp).
 *
 * The network part (calling Google's tokeninfo endpoint to validate an ID token)
 * lives in Code.js; this file holds the pure decisions so they can be unit-tested
 * in Node: parsing the admin allowlist and deciding whether a set of verified
 * token claims belongs to an allowed admin.
 *
 * Loaded by both Apps Script (globals) and Node (guarded module.exports).
 */

/**
 * Parses the `Users` tab into an email→owner allowlist. Columns are resolved by
 * header name (`Email`, `Owner`); emails are lower-cased for case-insensitive
 * matching. Rows missing either value are skipped.
 *
 * @param {Array<Array<*>>} values full `Users` sheet values incl. header row
 * @return {Object<string, string>} lowercased email → owner label
 */
function parseUsers(values) {
  if (!values || values.length < 2) return {}
  var header = values[0]
  var iEmail = -1
  var iOwner = -1
  for (var i = 0; i < header.length; i++) {
    var name = String(header[i] == null ? '' : header[i]).trim().toLowerCase()
    if (name === 'email') iEmail = i
    else if (name === 'owner') iOwner = i
  }
  if (iEmail === -1) return {}
  var admins = {}
  for (var r = 1; r < values.length; r++) {
    var email = String(values[r][iEmail] == null ? '' : values[r][iEmail]).trim().toLowerCase()
    var owner = iOwner === -1 ? '' : String(values[r][iOwner] == null ? '' : values[r][iOwner]).trim()
    if (email) admins[email] = owner
  }
  return admins
}

/**
 * Decides whether verified token claims belong to an allowed admin.
 *
 * The claims must already have been validated for authenticity by Google's
 * tokeninfo endpoint (signature + expiry). This function enforces the remaining
 * application checks: audience match (the token was minted for OUR client ID, so
 * a token issued to another app can't be replayed here), a verified email, and
 * membership in the allowlist.
 *
 * @param {Object|null} claims tokeninfo response (aud, email, email_verified, …)
 * @param {string} expectedAud our OAuth client ID
 * @param {Object<string, string>} admins email→owner allowlist
 * @return {{admin: boolean, email: string, owner: string, reason: string}}
 */
function evaluateAdmin(claims, expectedAud, admins) {
  if (!claims || !claims.email) {
    return { admin: false, email: '', owner: '', reason: 'invalid or expired token' }
  }
  var email = String(claims.email).toLowerCase()
  if (!expectedAud) {
    return { admin: false, email: email, owner: '', reason: 'server missing OAUTH_CLIENT_ID' }
  }
  if (claims.aud !== expectedAud) {
    return { admin: false, email: email, owner: '', reason: 'token audience mismatch' }
  }
  if (claims.email_verified !== true && String(claims.email_verified) !== 'true') {
    return { admin: false, email: email, owner: '', reason: 'email not verified' }
  }
  var owner = admins && Object.prototype.hasOwnProperty.call(admins, email) ? admins[email] : null
  if (owner == null) {
    return { admin: false, email: email, owner: '', reason: 'not an admin' }
  }
  return { admin: true, email: email, owner: owner, reason: '' }
}

// Node-only export (skipped in Apps Script, where `module` is undefined).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseUsers: parseUsers, evaluateAdmin: evaluateAdmin }
}
