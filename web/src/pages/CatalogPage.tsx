import { useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArchiveIcon, PlusIcon } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { useCatalog } from '@/catalog/CatalogProvider'
import { BookCard } from '@/catalog/BookCard'
import { FilterBar } from '@/catalog/FilterBar'
import { BookTable } from '@/catalog/BookTable'
import { LoadingDots } from '@/components/LoadingDots'
import { useAdminSlotContainer, useSubHeaderContainer } from '@/components/subheader'
import { Skeleton } from '@/components/ui/skeleton'
import {
  authorOptions,
  filterBooks,
  languageOptions,
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
    attention: params.get('attention') === '1',
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
  attention: 'attention',
}

export function CatalogPage() {
  // activeBooks, not books: admins also load archived ones, which stay out of the catalog.
  const { activeBooks: books, archivedBooks, taxonomies, loading, error, zoneColor } = useCatalog()
  const { isAdmin } = useAuth()
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
        const param = FILTER_TO_PARAM[key as keyof CatalogFilters]
        // Booleans live in the URL as "1" / absent; everything else as its value.
        updates[param] =
          typeof value === 'boolean' ? (value ? '1' : null) : ((value ?? null) as string | null)
      }
      setParam(updates)
    },
    [setParam],
  )

  const onClear = useCallback(() => {
    setParam({ q: null, author: null, zone: null, theme: null, owner: null, lang: null, reader: null, status: null, attention: null })
  }, [setParam])

  const visible = useMemo(
    () => sortBooks(filterBooks(books, filters), sortKey, sortDir),
    [books, filters, sortKey, sortDir],
  )
  const readers = useMemo(() => readerOptions(books), [books])
  const authors = useMemo(() => authorOptions(books), [books])
  const languages = useMemo(() => languageOptions(books), [books])
  const subHeader = useSubHeaderContainer()
  const adminSlot = useAdminSlotContainer()

  if (error) {
    return <p className="text-destructive py-12 text-center">{t('error.load')}</p>
  }

  return (
    <div className="flex flex-col gap-5">
      {/* The primary write action lives beside sign-in (see useAdminSlotContainer). */}
      {adminSlot &&
        isAdmin &&
        createPortal(
          <Button asChild size="sm" className="gap-1">
            <Link to="/book/new">
              <PlusIcon className="size-3.5" /> {t('admin.add')}
            </Link>
          </Button>,
          adminSlot,
        )}

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
              languages={languages}
              readers={readers}
              onClear={onClear}
            />
          </div>,
          subHeader,
        )}

      <div className="flex flex-wrap items-center justify-between gap-3">
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

        {isAdmin && (
          <Button asChild size="sm" variant="outline" className="gap-1">
            <Link to="/archived">
              <ArchiveIcon className="size-3.5" /> {t('admin.archived')}
              {archivedBooks.length > 0 && ` (${archivedBooks.length})`}
            </Link>
          </Button>
        )}
      </div>

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
