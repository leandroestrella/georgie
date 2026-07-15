import { useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCatalog } from '@/catalog/CatalogProvider'
import { BookCard } from '@/catalog/BookCard'
import { FilterBar } from '@/catalog/FilterBar'
import { BookTable } from '@/catalog/BookTable'
import { LoadingDots } from '@/components/LoadingDots'
import { useSubHeaderContainer } from '@/components/subheader'
import { Skeleton } from '@/components/ui/skeleton'
import {
  authorOptions,
  filterBooks,
  readerOptions,
  sortBooks,
  type CatalogFilters,
  type SortDir,
  type SortKey,
  type StatusFilter,
} from '@/catalog/filter'

/** Reads the current filter/sort/view state out of the URL query string. */
function readState(params: URLSearchParams) {
  const filters: CatalogFilters = {
    search: params.get('q') ?? '',
    author: params.get('author'),
    zone: params.get('zone'),
    theme: params.get('theme'),
    owner: params.get('owner'),
    language: params.get('lang'),
    readBy: params.get('reader'),
    status: (params.get('status') as StatusFilter) || 'all',
  }
  return {
    filters,
    sortKey: (params.get('sort') as SortKey) || 'title',
    sortDir: (params.get('dir') as SortDir) || 'asc',
    view: params.get('view') === 'table' ? ('table' as const) : ('cards' as const),
  }
}

const FILTER_TO_PARAM: Record<keyof CatalogFilters, string> = {
  search: 'q',
  author: 'author',
  zone: 'zone',
  theme: 'theme',
  owner: 'owner',
  language: 'lang',
  readBy: 'reader',
  status: 'status',
}

export function CatalogPage() {
  const { books, taxonomies, loading, error, zoneColor } = useCatalog()
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const { filters, sortKey, sortDir, view } = readState(params)

  const setParam = useCallback(
    (updates: Record<string, string | null>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(updates)) {
            if (v === null || v === '' || v === 'all') next.delete(k)
            else next.set(k, v)
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const onFilters = useCallback(
    (patch: Partial<CatalogFilters>) => {
      const updates: Record<string, string | null> = {}
      for (const [key, value] of Object.entries(patch)) {
        updates[FILTER_TO_PARAM[key as keyof CatalogFilters]] = value === undefined ? null : (value as string | null)
      }
      setParam(updates)
    },
    [setParam],
  )

  const onClear = useCallback(() => {
    setParam({ q: null, author: null, zone: null, theme: null, owner: null, lang: null, reader: null, status: null })
  }, [setParam])

  const visible = useMemo(
    () => sortBooks(filterBooks(books, filters), sortKey, sortDir),
    [books, filters, sortKey, sortDir],
  )
  const readers = useMemo(() => readerOptions(books), [books])
  const authors = useMemo(() => authorOptions(books), [books])
  const subHeader = useSubHeaderContainer()

  if (error) {
    return <p className="text-destructive py-12 text-center">{t('error.load')}</p>
  }

  return (
    <div className="flex flex-col gap-5">
      {/* The filter bar lives in the sticky header slot so it anchors while scrolling. */}
      {subHeader &&
        taxonomies &&
        createPortal(
          <div className="mx-auto w-full max-w-6xl px-4 pb-3 sm:px-6">
            <FilterBar
              filters={filters}
              onFilters={onFilters}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={(key, dir) => setParam({ sort: key, dir })}
              view={view}
              onView={(v) => setParam({ view: v === 'cards' ? null : v })}
              taxonomies={taxonomies}
              authors={authors}
              readers={readers}
              onClear={onClear}
            />
          </div>,
          subHeader,
        )}

      <p className="text-muted-foreground text-sm">
        {loading ? (
          <>
            {t('catalog.loading')}
            <LoadingDots />
          </>
        ) : (
          t('catalog.count', { count: visible.length })
        )}
      </p>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-[3/4] w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">{t('catalog.empty')}</p>
      ) : view === 'table' ? (
        <BookTable books={visible} zoneColor={zoneColor} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {visible.map((book) => (
            <BookCard key={book.id} book={book} colors={zoneColor(book.zone)} />
          ))}
        </div>
      )}
    </div>
  )
}
