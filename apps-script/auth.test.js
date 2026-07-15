/**
 * Unit tests for the pure authorization logic (node --test).
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const { parseUsers, evaluateAdmin } = require('./auth.js')

const USERS = [
  ['Email', 'Owner'],
  ['Leandro@Example.com', 'leandro'], // mixed case → normalized
  ['maria@example.com', 'maria'],
  ['', 'ghost'], // no email → skipped
]

const AUD = 'client-123.apps.googleusercontent.com'
const admins = parseUsers(USERS)

test('parseUsers builds a lowercased email→owner allowlist by header name', () => {
  assert.deepEqual(admins, { 'leandro@example.com': 'leandro', 'maria@example.com': 'maria' })
})

test('parseUsers tolerates reordered columns and missing Users tab', () => {
  const reordered = [['Owner', 'Email'], ['leandro', 'leandro@example.com']]
  assert.deepEqual(parseUsers(reordered), { 'leandro@example.com': 'leandro' })
  assert.deepEqual(parseUsers([]), {})
  assert.deepEqual(parseUsers([['Email', 'Owner']]), {})
})

test('evaluateAdmin accepts a valid, allowlisted, verified token', () => {
  const r = evaluateAdmin(
    { aud: AUD, email: 'Leandro@example.com', email_verified: true },
    AUD,
    admins,
  )
  assert.deepEqual(r, { admin: true, email: 'leandro@example.com', owner: 'leandro', reason: '' })
})

test('evaluateAdmin accepts string "true" for email_verified (tokeninfo returns strings)', () => {
  const r = evaluateAdmin({ aud: AUD, email: 'maria@example.com', email_verified: 'true' }, AUD, admins)
  assert.equal(r.admin, true)
  assert.equal(r.owner, 'maria')
})

test('evaluateAdmin rejects a token minted for another client (aud mismatch)', () => {
  const r = evaluateAdmin(
    { aud: 'someone-else', email: 'leandro@example.com', email_verified: true },
    AUD,
    admins,
  )
  assert.equal(r.admin, false)
  assert.match(r.reason, /audience/)
})

test('evaluateAdmin rejects a non-allowlisted email', () => {
  const r = evaluateAdmin({ aud: AUD, email: 'stranger@example.com', email_verified: true }, AUD, admins)
  assert.equal(r.admin, false)
  assert.equal(r.reason, 'not an admin')
})

test('evaluateAdmin rejects unverified email and empty/expired claims', () => {
  assert.equal(evaluateAdmin({ aud: AUD, email: 'leandro@example.com', email_verified: false }, AUD, admins).admin, false)
  assert.equal(evaluateAdmin(null, AUD, admins).reason, 'invalid or expired token')
})

test('evaluateAdmin fails closed when the server has no client ID configured', () => {
  const r = evaluateAdmin({ aud: AUD, email: 'leandro@example.com', email_verified: true }, '', admins)
  assert.equal(r.admin, false)
  assert.match(r.reason, /OAUTH_CLIENT_ID/)
})
