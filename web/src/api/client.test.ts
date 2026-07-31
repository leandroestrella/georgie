/**
 * Client tests in MOCK mode (no VITE_API_URL configured → hasBackend is false).
 * These verify the offline in-memory store the UI develops against.
 */
import { afterEach, describe, expect, it } from 'vitest'
import {
  __resetMockStore,
  addBook,
  completeExchange,
  deleteBook,
  getBook,
  getBooks,
  getTaxonomies,
  restoreBook,
  setExchange,
  setLoan,
  updateBook,
} from './client'
import type { NewBook } from './types'

afterEach(() => __resetMockStore())

const draft = (over: Partial<NewBook> = {}): NewBook => ({
  title: 'Test Book',
  author: 'Jane Author',
  year: 2021,
  yearPrecision: '',
  publisher: 'Test Press',
  isbn: 'N/A',
  language: ['English'],
  originalLanguage: 'English',
  coverUrl: '',
  theme: 'Poetry & Verse',
  owner: 'leandro',
  referenceUrl: '',
  readBy: [],
  borrowed: false,
  borrowerName: '',
  loanDate: '',
  exchangeStatus: '',
  exchangeNote: '',
  exchangeLink: '',
  archived: false,
  ...over,
})

describe('reads', () => {
  it('getBooks returns fixtures and excludes archived', async () => {
    const books = await getBooks()
    expect(books.length).toBeGreaterThan(0)
    expect(books.every((b) => !b.archived)).toBe(true)
  })

  it('getTaxonomies exposes zones, owners and languages', async () => {
    const tax = await getTaxonomies()
    expect(tax.zones.length).toBe(8)
    expect(tax.owners).toContain('maria')
    expect(tax.languages).toContain('English')
    // every theme maps back to a zone
    for (const zone of tax.zones)
      for (const theme of zone.themes) expect(tax.themeToZone[theme.name]).toBe(zone.name)
  })

  it('getBook finds by id and returns null when missing', async () => {
    const [first] = await getBooks()
    expect((await getBook(first.id))?.id).toBe(first.id)
    expect(await getBook('NOPE-000-0000')).toBeNull()
  })

  it('returns copies, not references into the store', async () => {
    const a = await getBooks()
    a[0].title = 'mutated'
    const b = await getBooks()
    expect(b[0].title).not.toBe('mutated')
  })
})

describe('writes', () => {
  it('addBook assigns a call-number id and derives the zone', async () => {
    const book = await addBook(draft({ title: '1984', author: 'George Orwell', year: 1950 }))
    expect(book.id).toBe('ORW-198-1950')
    expect(book.zone).toBe('The Old Library (Canon & Antiquity)') // parent of Poetry & Verse
    expect((await getBooks()).some((b) => b.id === book.id)).toBe(true)
  })

  it('addBook suffixes a colliding id', async () => {
    const first = await addBook(draft({ title: '1984', author: 'George Orwell', year: 1950 }))
    const second = await addBook(draft({ title: '1984', author: 'George Orwell', year: 1950 }))
    expect(first.id).toBe('ORW-198-1950')
    expect(second.id).toBe('ORW-198-1950-2')
  })

  it('updateBook patches fields and re-derives zone on theme change', async () => {
    const book = await addBook(draft({ theme: 'Poetry & Verse' }))
    const updated = await updateBook(book.id, { theme: 'Digital & Media Theory', title: 'Renamed' })
    expect(updated.title).toBe('Renamed')
    expect(updated.zone).toBe('The Machine (Systems & Signals)')
  })

  it('deleteBook archives (hidden from getBooks) and restoreBook brings it back', async () => {
    const book = await addBook(draft())
    await deleteBook(book.id)
    expect((await getBooks()).some((b) => b.id === book.id)).toBe(false)
    await restoreBook(book.id)
    expect((await getBooks()).some((b) => b.id === book.id)).toBe(true)
  })

  it('setLoan borrows with a date, then clears on return', async () => {
    const book = await addBook(draft())
    const borrowed = await setLoan(book.id, { borrowerName: 'Sam', loanDate: '2024-05-01' })
    expect(borrowed.borrowed).toBe(true)
    expect(borrowed.borrowerName).toBe('Sam')
    expect(borrowed.loanDate).toBe('2024-05-01')

    const returned = await setLoan(book.id, null)
    expect(returned.borrowed).toBe(false)
    expect(returned.borrowerName).toBe('')
    expect(returned.loanDate).toBe('')
  })

  it('updateBook throws for an unknown id', async () => {
    await expect(updateBook('NOPE-000-0000', { title: 'x' })).rejects.toThrow(/not found/i)
  })

  it('walks the exchange flow offered → confirmed → in transit → received, linking and releasing the incoming book', async () => {
    const outgoing = await addBook(draft({ title: 'Outgoing', theme: 'Poetry & Verse' }))
    // Mirrors BookFormPage's `?exchangeWith=` handoff: the incoming book is
    // added Borrowed (not yet on the shelf) and linked back to the outgoing one.
    const incoming = await addBook(draft({ title: 'Incoming', theme: 'Poetry & Verse' }))
    await setLoan(incoming.id, { borrowerName: 'from marco' })
    await updateBook(incoming.id, { exchangeLink: outgoing.id })

    let book = await setExchange(outgoing.id, { status: 'offered' })
    expect(book.exchangeStatus).toBe('offered')

    book = await setExchange(outgoing.id, { status: 'confirmed', note: 'from marco', link: incoming.id })
    expect(book.exchangeStatus).toBe('confirmed')
    expect(book.exchangeNote).toBe('from marco')
    expect(book.exchangeLink).toBe(incoming.id)

    book = await setExchange(outgoing.id, { status: 'in transit', note: 'from marco', link: incoming.id })
    expect(book.exchangeStatus).toBe('in transit')
    // Archived the moment it ships — once mailed out it's gone for good,
    // unlike a loan, so it drops out of the active catalog immediately.
    expect(book.archived).toBe(true)
    expect((await getBooks()).some((b) => b.id === outgoing.id)).toBe(false)

    const { book: archived, linked } = await completeExchange(outgoing.id)
    expect(archived.archived).toBe(true)
    expect(archived.exchangeStatus).toBe('')
    expect((await getBooks()).some((b) => b.id === outgoing.id)).toBe(false)
    // The linked (incoming) book's updated state must come back from
    // completeExchange itself — the caller applies it to the local cache,
    // which would otherwise keep showing it as borrowed.
    expect(linked?.id).toBe(incoming.id)
    expect(linked?.borrowed).toBe(false)

    const released = await getBook(incoming.id)
    expect(released?.borrowed).toBe(false)
    expect(released?.exchangeLink).toBe('')
  })

  it('setExchange(null) withdraws, clearing all three exchange fields', async () => {
    const book = await addBook(draft({ theme: 'Poetry & Verse' }))
    await setExchange(book.id, { status: 'offered' })
    const withdrawn = await setExchange(book.id, null)
    expect(withdrawn.exchangeStatus).toBe('')
    expect(withdrawn.exchangeNote).toBe('')
    expect(withdrawn.exchangeLink).toBe('')
  })

  it('setExchange(null) un-archives a book withdrawn while in transit', async () => {
    const book = await addBook(draft({ theme: 'Poetry & Verse' }))
    await setExchange(book.id, { status: 'offered' })
    await setExchange(book.id, { status: 'confirmed' })
    const inTransit = await setExchange(book.id, { status: 'in transit' })
    expect(inTransit.archived).toBe(true)
    const withdrawn = await setExchange(book.id, null)
    expect(withdrawn.archived).toBe(false)
    expect((await getBooks()).some((b) => b.id === book.id)).toBe(true)
  })
})
