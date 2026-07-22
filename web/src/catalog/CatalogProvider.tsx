import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getAllBooks, getBooks, getTaxonomies } from '@/api/client'
import type { Book, Taxonomies } from '@/api/types'
import { useAuth } from '@/auth/AuthProvider'
import { buildZoneColorMap, NEUTRAL_ZONE, type ZoneColors } from './zoneColors'

interface CatalogContextValue {
  /** Every loaded book. Includes archived ones only when an admin is signed in. */
  books: Book[]
  /** Books visible in the public catalog (archived excluded). */
  activeBooks: Book[]
  /** Archived books — populated for admins only. */
  archivedBooks: Book[]
  taxonomies: Taxonomies | null
  loading: boolean
  error: string | null
  reload: () => void
  getBook: (id: string) => Book | undefined
  /** Inserts or replaces a book in the cache after a write (optimistic update). */
  applyBook: (book: Book) => void
  zoneColor: (zoneName: string) => ZoneColors
  /** The curatorial description of a zone (from the `Zones` tab), or '' if none. */
  zoneDescription: (zoneName: string) => string
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

/**
 * Loads the catalog + taxonomy once and caches them in memory. Admins get the
 * archived books too (via the token-gated read), so the Archived view and
 * restore work without a second round trip. Writes update this cache in place
 * rather than refetching the whole catalog.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [taxonomies, setTaxonomies] = useState<Taxonomies | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([isAdmin ? getAllBooks() : getBooks(), getTaxonomies()])
      .then(([b, t]) => {
        setBooks(b)
        setTaxonomies(t)
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [isAdmin])

  // Re-runs when admin status flips, so signing in pulls in the archived books.
  useEffect(() => reload(), [reload])

  const applyBook = useCallback((book: Book) => {
    setBooks((prev) => {
      const i = prev.findIndex((b) => b.id === book.id)
      if (i === -1) return [...prev, book]
      const next = [...prev]
      next[i] = book
      return next
    })
  }, [])

  const zoneColorMap = useMemo(
    () => buildZoneColorMap((taxonomies?.zones ?? []).map((z) => z.name)),
    [taxonomies],
  )
  const zoneDescriptions = useMemo(
    () => new Map((taxonomies?.zones ?? []).map((z) => [z.name, z.description])),
    [taxonomies],
  )
  const activeBooks = useMemo(() => books.filter((b) => !b.archived), [books])
  const archivedBooks = useMemo(() => books.filter((b) => b.archived), [books])

  const value = useMemo<CatalogContextValue>(
    () => ({
      books,
      activeBooks,
      archivedBooks,
      taxonomies,
      loading,
      error,
      reload,
      applyBook,
      getBook: (id) => books.find((b) => b.id === id),
      zoneColor: (name) => zoneColorMap.get(name) ?? NEUTRAL_ZONE,
      zoneDescription: (name) => zoneDescriptions.get(name) ?? '',
    }),
    [books, activeBooks, archivedBooks, taxonomies, loading, error, reload, applyBook, zoneColorMap, zoneDescriptions],
  )

  return <CatalogContext value={value}>{children}</CatalogContext>
}

/** Access the loaded catalog. Must be used within a {@link CatalogProvider}. */
export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within a CatalogProvider')
  return ctx
}
