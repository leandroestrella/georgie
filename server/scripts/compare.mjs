#!/usr/bin/env node
/**
 * Runs both backends side by side and compares their answers: the Apps Script
 * web app (reading the sheet directly) against this Worker (reading its
 * database, synced from the same sheet). Run it before switching the SPA over,
 * and again whenever in doubt — after a sync, the two should agree exactly.
 *
 *   npm run compare -- [--old <apps script /exec url>] [--new <worker origin>]
 *
 * `--old` defaults to VITE_API_URL in ../web/.env.local, `--new` to
 * https://georgie.pomuku.workers.dev. Read-only: public reads on both sides.
 *
 * The two differ in shape, not in content, and the comparison allows for that:
 * an empty field is '' / [] / false there and null here, and a book's zone is
 * sent there and derived here (theme → zone, through the taxonomy).
 */
import { existsSync, readFileSync } from 'node:fs'

const arg = (name) => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}
function envLocal() {
  const file = new URL('../../web/.env.local', import.meta.url)
  if (!existsSync(file)) return undefined
  return /^VITE_API_URL=(.+)$/m.exec(readFileSync(file, 'utf8'))?.[1]?.trim()
}

const oldUrl = arg('old') ?? envLocal()
const newUrl = (arg('new') ?? 'https://georgie.pomuku.workers.dev').replace(/\/$/, '')
if (!oldUrl) {
  console.error('no Apps Script URL: pass --old, or set VITE_API_URL in web/.env.local')
  process.exit(1)
}

async function timed(label, url) {
  const started = performance.now()
  const response = await fetch(url)
  const body = await response.json()
  const seconds = ((performance.now() - started) / 1000).toFixed(2)
  if (!body.ok) throw new Error(`${label}: ${body.error ?? response.status}`)
  return { body, seconds }
}

const LISTS = ['language', 'readBy']
const FLAGS = ['borrowed', 'archived']
/** A book from either side, brought to one shape. */
function normal(book) {
  const { rev: _rev, updatedAt: _updatedAt, zone: _zone, ...fields } = book
  for (const [key, value] of Object.entries(fields)) {
    if (LISTS.includes(key)) fields[key] = value ?? []
    else if (FLAGS.includes(key)) fields[key] = value ?? false
    else if (key !== 'year') fields[key] = value ?? ''
  }
  return fields
}

const [oldBooks, oldTaxonomies, newBooks, newTaxonomies] = await Promise.all([
  timed('old books', `${oldUrl}?action=books`),
  timed('old taxonomies', `${oldUrl}?action=taxonomies`),
  timed('new catalog', `${newUrl}/api/v1/catalog`),
  timed('new taxonomies', `${newUrl}/api/v1/taxonomies`),
])
console.log(`apps script: books ${oldBooks.seconds} s, taxonomies ${oldTaxonomies.seconds} s`)
console.log(`worker:      catalog ${newBooks.seconds} s, taxonomies ${newTaxonomies.seconds} s\n`)

const differences = []
const theirs = new Map(oldBooks.body.books.map((book) => [book.id, book]))
const ours = new Map(newBooks.body.rows.map((book) => [book.id, book]))
const themeToZone = newTaxonomies.body.taxonomies.themeToZone

for (const [id, book] of theirs) {
  const mine = ours.get(id)
  if (!mine) {
    differences.push(`${id}: only in apps script ("${book.title}")`)
    continue
  }
  const a = normal(book)
  const b = normal(mine)
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) differences.push(`${id}: ${key}: ${JSON.stringify(a[key])} there, ${JSON.stringify(b[key])} here`)
  }
  const zone = themeToZone[mine.theme ?? ''] ?? ''
  if (zone !== book.zone) differences.push(`${id}: zone: "${book.zone}" there, "${zone}" derived here`)
}
for (const [id, book] of ours) {
  if (!theirs.has(id)) differences.push(`${id}: only in the worker ("${book.title}")`)
}

/** JSON with every object's keys in order, so two equal values print the same. */
const ordered = (value) =>
  JSON.stringify(value, (_key, inner) =>
    inner && typeof inner === 'object' && !Array.isArray(inner) ? Object.fromEntries(Object.entries(inner).sort(([x], [y]) => x.localeCompare(y))) : inner,
  )
for (const key of new Set([...Object.keys(oldTaxonomies.body.taxonomies), ...Object.keys(newTaxonomies.body.taxonomies)])) {
  if (ordered(oldTaxonomies.body.taxonomies[key]) !== ordered(newTaxonomies.body.taxonomies[key])) differences.push(`taxonomies.${key} differs`)
}

console.log(`${theirs.size} books in apps script, ${ours.size} in the worker`)
if (differences.length === 0) {
  console.log('the two backends agree')
} else {
  console.log(`${differences.length} difference(s):`)
  for (const line of differences.slice(0, 50)) console.log(`  ${line}`)
  if (differences.length > 50) console.log(`  … and ${differences.length - 50} more`)
  process.exit(1)
}
