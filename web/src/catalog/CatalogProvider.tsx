import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getAllBooks, getBooks, getTaxonomies } from '@/api/client'
import type { Book, Taxonomies } from '@/api/types'
import { useAuth } from '@/auth/AuthProvider'
import { buildZoneColorMap, NEUTRAL_ZONE, type ZoneColors } from './zoneColors'
import { ownerLogo } from './ownerLogos'
import { zoneEmoji } from './zoneEmojis'

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
  /** The curatorial description of a zone (from the `Zones` tab), localized to
   *  `lang` when a translation exists, else the English original; '' if none. */
  zoneDescription: (zoneName: string, lang?: string) => string
  /** The zone's visual marker (emoji or image URL) from the sheet, falling back
   *  to the built-in emoji map; '' when nothing is set. */
  zoneMarker: (zoneName: string) => string
  /** An owner's (or reader's) visual marker (emoji or image URL) from the sheet,
   *  falling back to the built-in logo map; '' when nothing is set. */
  ownerMarker: (name: string) => string
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
  // name → { en: <Description>, it/es/…: <translations> }. English lives under
  // `en`; the resolver falls back to it when a language has no translation.
  const zoneDescriptions = useMemo(
    () =>
      new Map<string, Record<string, string>>(
        (taxonomies?.zones ?? []).map((z) => [z.name, { en: z.description, ...(z.descriptions ?? {}) }]),
      ),
    [taxonomies],
  )
  // Zone/owner markers from the sheet, keyed by name. Resolvers below fall back
  // to the built-in emoji/logo maps when the sheet doesn't supply a marker.
  const zoneMarkers = useMemo(
    () => new Map((taxonomies?.zones ?? []).map((z) => [z.name, z.marker ?? ''])),
    [taxonomies],
  )
  const ownerMarkers = useMemo(() => taxonomies?.ownerMarkers ?? {}, [taxonomies])
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
      zoneDescription: (name, lang) => {
        const byLang = zoneDescriptions.get(name)
        if (!byLang) return ''
        return (lang && byLang[lang]) || byLang.en || ''
      },
      zoneMarker: (name) => zoneMarkers.get(name) || zoneEmoji(name) || '',
      ownerMarker: (name) => ownerMarkers[name] || ownerLogo(name) || '',
    }),
    [books, activeBooks, archivedBooks, taxonomies, loading, error, reload, applyBook, zoneColorMap, zoneDescriptions, zoneMarkers, ownerMarkers],
  )

  return <CatalogContext value={value}>{children}</CatalogContext>
}

/** Access the loaded catalog. Must be used within a {@link CatalogProvider}. */
export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within a CatalogProvider')
  return ctx
}
