import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getBooks, getTaxonomies } from '@/api/client'
import type { Book, Taxonomies } from '@/api/types'
import { buildZoneColorMap, NEUTRAL_ZONE, type ZoneColors } from './zoneColors'

interface CatalogContextValue {
  books: Book[]
  taxonomies: Taxonomies | null
  loading: boolean
  error: string | null
  reload: () => void
  getBook: (id: string) => Book | undefined
  zoneColor: (zoneName: string) => ZoneColors
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

/**
 * Loads the catalog + taxonomy once and caches them in memory (writes will
 * update this optimistically in later phases). Everything downstream reads from
 * here so the whole-catalog fetch happens exactly once per session.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>([])
  const [taxonomies, setTaxonomies] = useState<Taxonomies | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([getBooks(), getTaxonomies()])
      .then(([b, t]) => {
        setBooks(b)
        setTaxonomies(t)
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => reload(), [reload])

  const zoneColorMap = useMemo(
    () => buildZoneColorMap((taxonomies?.zones ?? []).map((z) => z.name)),
    [taxonomies],
  )

  const value = useMemo<CatalogContextValue>(
    () => ({
      books,
      taxonomies,
      loading,
      error,
      reload,
      getBook: (id) => books.find((b) => b.id === id),
      zoneColor: (name) => zoneColorMap.get(name) ?? NEUTRAL_ZONE,
    }),
    [books, taxonomies, loading, error, reload, zoneColorMap],
  )

  return <CatalogContext value={value}>{children}</CatalogContext>
}

/** Access the loaded catalog. Must be used within a {@link CatalogProvider}. */
export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog must be used within a CatalogProvider')
  return ctx
}
