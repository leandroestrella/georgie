/**
 * Pure validation for the book form — no React, fully unit-tested.
 *
 * The `N/A` sentinel is first-class here: it means "this printing genuinely has
 * no ISBN" and must validate as *valid-and-absent*, never as a malformed ISBN
 * (see PLAN.md §7).
 */
import type { Book, NewBook } from '@/api/types'
import { NO_ISBN } from './constants'

/** True when an ISBN cell means "absent": blank or the `N/A` sentinel. */
export function isbnIsAbsent(isbn: string): boolean {
  const s = (isbn ?? '').trim().toUpperCase()
  return s === '' || s === NO_ISBN
}

/** Strips separators, leaving digits and a trailing X. */
export function normalizeIsbn(isbn: string): string {
  return (isbn ?? '').replace(/[^0-9Xx]/g, '').toUpperCase()
}

/** Validates an ISBN-10 checksum (mod 11, trailing X = 10). */
export function isValidIsbn10(raw: string): boolean {
  const s = normalizeIsbn(raw)
  if (!/^\d{9}[\dX]$/.test(s)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += (i + 1) * Number(s[i])
  const check = s[9] === 'X' ? 10 : Number(s[9])
  return (sum + 10 * check) % 11 === 0
}

/** Validates an ISBN-13 / EAN checksum (alternating 1/3 weights, mod 10). */
export function isValidIsbn13(raw: string): boolean {
  const s = normalizeIsbn(raw)
  if (!/^\d{13}$/.test(s)) return false
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(s[i]) * (i % 2 === 0 ? 1 : 3)
  return (10 - (sum % 10)) % 10 === Number(s[12])
}

/** Accepts both ISBN-10 and ISBN-13, and treats blank/`N/A` as valid (absent). */
export function isValidIsbn(raw: string): boolean {
  if (isbnIsAbsent(raw)) return true
  const s = normalizeIsbn(raw)
  return s.length === 10 ? isValidIsbn10(s) : s.length === 13 ? isValidIsbn13(s) : false
}

/** Field-keyed validation errors; empty object means the draft is valid. */
export type BookErrors = Partial<Record<'title' | 'year' | 'isbn' | 'theme', string>>

/** The current year, used to bound the Year field. */
function thisYear(): number {
  return new Date().getFullYear()
}

/**
 * Validates a book draft. Returns i18n keys (not messages) so the form can
 * render them in the active language.
 */
export function validateBook(draft: Pick<NewBook, 'title' | 'year' | 'isbn' | 'theme'>): BookErrors {
  const errors: BookErrors = {}

  if (!draft.title?.trim()) errors.title = 'form.errors.titleRequired'

  if (draft.year !== null && draft.year !== undefined) {
    const y = Number(draft.year)
    if (!Number.isInteger(y) || y < 1 || y > thisYear() + 1) errors.year = 'form.errors.yearInvalid'
  }

  if (!isValidIsbn(draft.isbn ?? '')) errors.isbn = 'form.errors.isbnInvalid'

  if (!draft.theme?.trim()) errors.theme = 'form.errors.themeRequired'

  return errors
}

/** Why a book needs attention — the admin's checklist for finishing the catalog. */
export type AttentionReason = 'missingYear' | 'circaYear' | 'missingCover' | 'missingOriginalLanguage'

/**
 * Lists what's incomplete about a book. Drives the admin "needs attention"
 * filter that turns the remaining cleanup into a task done from the shelf.
 */
export function attentionReasons(book: Book): AttentionReason[] {
  const reasons: AttentionReason[] = []
  if (book.year === null) reasons.push('missingYear')
  if (book.yearPrecision === 'circa') reasons.push('circaYear')
  if (!book.coverUrl.trim()) reasons.push('missingCover')
  if (!book.originalLanguage.trim()) reasons.push('missingOriginalLanguage')
  return reasons
}

/** True when a book has anything worth an admin's attention. */
export function needsAttention(book: Book): boolean {
  return attentionReasons(book).length > 0
}
