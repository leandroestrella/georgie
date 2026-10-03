import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { getAllBooks, getBooks, getTaxonomies, peekBooks, peekTaxonomies, watchBooks } from '@/api/client'
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
  /** A zone's name, localized to `lang` when the sheet supplies a translation
   *  (`Title (it)`/`Title (es)`), else the canonical English name unchanged. */
  zoneName: (zoneName: string, lang?: string) => string
  /** The curatorial description of a zone (from the `Zones` tab), localized to
   *  `lang` when a translation exists, else the English original; '' if none. */
  zoneDescription: (zoneName: string, lang?: string) => string
  /** The zone's visual marker (emoji or image URL) from the sheet, falling back
   *  to the built-in emoji map; '' when nothing is set. */
  zoneMarker: (zoneName: string) => string
  /** A theme's name, localized to `lang` when the sheet supplies a translation
   *  (`Themes (it)`/`Themes (es)`), else the canonical English name unchanged. */
  themeName: (themeName: string, lang?: string) => string
  /** The curatorial description of a theme (from the `Zones` tab's `Theme
   *  description` column), localized to `lang` when a translation exists, else
   *  the English original; '' if none. */
  themeDescription: (themeName: string, lang?: string) => string
  /** An owner's (or reader's) visual marker (emoji or image URL) from the sheet,
   *  falling back to the built-in logo map; '' when nothing is set. */
  ownerMarker: (name: string) => string
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

/**
 * Holds the catalog + taxonomy for the pages. Both open on the copy kept on
 * this device (so a returning visitor sees the catalog at once) and are then
 * read fresh from the backend; whenever the device's copy changes — the fresh
 * read arriving, a save, a save refused as outdated bringing the row as it is
 * now — the books here follow. Signed-in people get the whole table, archived
 * books included, so the Archived view and restore need no second round trip.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  const [rows, setRows] = useState<Book[] | null>(() => peekBooks(isAdmin))
  const [taxonomies, setTaxonomies] = useState<Taxonomies | null>(() => peekTaxonomies())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** Whether the books on hand are the signed-in ones (null before the first load). */
  const [loadedAsAdmin, setLoadedAsAdmin] = useState<boolean | null>(null)
  /**
   * Bumped on every reload. Signing in (or a remembered session being picked
   * up) starts a second read while the public one may still be on its way;
   * only the latest request may write its result.
   */
  const requestRef = useRef(0)

  const reload = useCallback(() => {
    const request = ++requestRef.current
    const current = () => request === requestRef.current
    // The device's copy for whoever is looking now, shown while the fresh one loads.
    const kept = peekBooks(isAdmin)
    if (kept) setRows(kept)
    setLoading(true)
    setError(null)
    Promise.all([isAdmin ? getAllBooks() : getBooks(), getTaxonomies()])
      .then(([b, t]) => {
        if (!current()) return
        setRows(b)
        setTaxonomies(t)
      })
      .catch((e) => {
        // With a copy on screen, a backend that can't be reached isn't an error
        // worth replacing it with.
        if (current() && !peekBooks(isAdmin)) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!current()) return
        setLoading(false)
        setLoadedAsAdmin(isAdmin)
      })
  }, [isAdmin])

  // Re-runs when sign-in status flips, so signing in pulls in the archived books.
  useEffect(() => reload(), [reload])

  // Follows the device's copy: every save lands here without a refetch.
  useEffect(() => watchBooks(isAdmin, setRows), [isAdmin])

  const applyBook = useCallback((book: Book) => {
    setRows((prev) => {
      if (!prev) return [book]
      const i = prev.findIndex((b) => b.id === book.id)
      if (i === -1) return [...prev, book]
      const next = [...prev]
      next[i] = book
      return next
    })
  }, [])

  // A book's zone is derived from its theme. Re-derived here so that books read
  // from the device before the taxonomy arrived get theirs once it does.
  const books = useMemo(() => {
    const themeToZone = taxonomies?.themeToZone ?? {}
    return (rows ?? []).map((book) => (book.zone || !themeToZone[book.theme] ? book : { ...book, zone: themeToZone[book.theme] }))
  }, [rows, taxonomies])

  const zoneColorMap = useMemo(
    () => buildZoneColorMap((taxonomies?.zones ?? []).map((z) => z.name)),
    [taxonomies],
  )
  // name → { en: <Title>, it/es/…: <translations> }. English lives under `en`;
  // the resolver falls back to it when a language has no translation.
  const zoneNames = useMemo(
    () =>
      new Map<string, Record<string, string>>(
        (taxonomies?.zones ?? []).map((z) => [z.name, { en: z.name, ...(z.names ?? {}) }]),
      ),
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
  // Same two shapes, flattened across every zone's themes and keyed by theme name.
  const themeNames = useMemo(
    () =>
      new Map<string, Record<string, string>>(
        (taxonomies?.zones ?? []).flatMap((z) =>
          z.themes.map((th) => [th.name, { en: th.name, ...(th.names ?? {}) }] as const),
        ),
      ),
    [taxonomies],
  )
  const themeDescriptions = useMemo(
    () =>
      new Map<string, Record<string, string>>(
        (taxonomies?.zones ?? []).flatMap((z) =>
          z.themes.map((th) => [th.name, { en: th.description ?? '', ...(th.descriptions ?? {}) }] as const),
        ),
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
  // "Loading" only while there is nothing to show yet. Also for the render
  // between someone signing in (or a remembered session being picked up) and
  // their reload finishing, when the books on hand are still the public ones,
  // without the archive.
  const pending = (loading && (rows === null || taxonomies === null)) || (isAdmin && loadedAsAdmin === false && peekBooks(true) === null)

  const value = useMemo<CatalogContextValue>(
    () => ({
      books,
      activeBooks,
      archivedBooks,
      taxonomies,
      loading: pending,
      error,
      reload,
      applyBook,
      getBook: (id) => books.find((b) => b.id === id),
      zoneColor: (name) => zoneColorMap.get(name) ?? NEUTRAL_ZONE,
      zoneName: (name, lang) => {
        const byLang = zoneNames.get(name)
        if (!byLang) return name
        return (lang && byLang[lang]) || byLang.en || name
      },
      zoneDescription: (name, lang) => {
        const byLang = zoneDescriptions.get(name)
        if (!byLang) return ''
        return (lang && byLang[lang]) || byLang.en || ''
      },
      zoneMarker: (name) => zoneMarkers.get(name) || zoneEmoji(name) || '',
      themeName: (name, lang) => {
        const byLang = themeNames.get(name)
        if (!byLang) return name
        return (lang && byLang[lang]) || byLang.en || name
      },
      themeDescription: (name, lang) => {
        const byLang = themeDescriptions.get(name)
        if (!byLang) return ''
        return (lang && byLang[lang]) || byLang.en || ''
      },
      ownerMarker: (name) => ownerMarkers[name] || ownerLogo(name) || '',
    }),
    [
      books,
      activeBooks,
      archivedBooks,
      taxonomies,
      pending,
      error,
      reload,
      applyBook,
      zoneColorMap,
      zoneNames,
      zoneDescriptions,
      zoneMarkers,
      themeNames,
      themeDescriptions,
      ownerMarkers,
    ],
  )

  return <CatalogContext value={value}>{children}</CatalogContext>
}

/** Access the loaded catalog. Must be used within a {@link CatalogProvider}. */
export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within a CatalogProvider')
  return ctx
}
