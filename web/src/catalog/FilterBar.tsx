import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LayoutGridIcon,
  ListIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react'
import type { Taxonomies } from '@/api/types'
import { useAuth } from '@/auth/AuthProvider'
import { useHideOnScroll } from '@/hooks/useHideOnScroll'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useVocab } from '@/i18n/vocab'
import {
  activeFilterCount,
  hasActiveFilters,
  type CatalogFilters,
  type SortDir,
  type SortKey,
  type StatusFilter,
} from './filter'

const ALL = '__all__'

interface Option {
  value: string
  label: string
}

/** A single labelled facet dropdown; empty selection is represented by `null`. */
function Facet({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | null
  options: Option[]
  onChange: (v: string | null) => void
}) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
      <SelectTrigger size="sm" className="w-full sm:w-auto">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{label}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export interface FilterBarProps {
  filters: CatalogFilters
  onFilters: (patch: Partial<CatalogFilters>) => void
  sortKey: SortKey
  sortDir: SortDir
  onSort: (key: SortKey, dir: SortDir) => void
  view: 'cards' | 'table'
  onView: (v: 'cards' | 'table') => void
  taxonomies: Taxonomies
  authors: string[]
  readers: string[]
  onClear: () => void
}

export function FilterBar(props: FilterBarProps) {
  const { filters, onFilters, sortKey, sortDir, onSort, view, onView, taxonomies, authors, readers, onClear } = props
  const { t } = useTranslation()
  const tv = useVocab()
  const { isAdmin } = useAuth()

  // On phones the facets stack full-width — seven of them fill the screen — so
  // they collapse behind a toggle. Desktop keeps them inline (`sm:` styles win).
  const [expanded, setExpanded] = useState(false)
  const scrollingDown = useHideOnScroll()
  const activeCount = activeFilterCount(filters)

  // Collapse whenever the reader goes back to the catalog: on scroll, and after
  // a search — the two moments they want the screen back.
  useEffect(() => {
    if (scrollingDown) setExpanded(false)
  }, [scrollingDown])

  // Themes narrow to the selected zone; otherwise show every theme.
  const themeNames = filters.zone
    ? (taxonomies.zones.find((z) => z.name === filters.zone)?.themes ?? [])
    : taxonomies.zones.flatMap((z) => z.themes)

  const zoneOptions = taxonomies.zones.map((z) => ({ value: z.name, label: tv('zone', z.name) }))
  const themeOptions = themeNames.map((name) => ({ value: name, label: tv('theme', name) }))
  const ownerOptions = taxonomies.owners.map((o) => ({ value: o, label: o }))
  const languageOptions = taxonomies.languages.map((l) => ({ value: l, label: tv('language', l) }))
  const authorOpts = authors.map((a) => ({ value: a, label: a }))
  const readerOptions = readers.map((r) => ({ value: r, label: r }))

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      {/* Search, plus (on phones) the toggle that reveals the facets. */}
      <div className="flex items-center gap-2">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault()
            // "Made a search" — hand the screen back to the results.
            setExpanded(false)
            e.currentTarget.querySelector('input')?.blur()
          }}
        >
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={filters.search}
            onChange={(e) => onFilters({ search: e.target.value })}
            placeholder={t('catalog.search')}
            className="pl-9"
            type="search"
            enterKeyHint="search"
          />
        </form>

        <Button
          type="button"
          size="sm"
          variant={activeCount ? 'default' : 'outline'}
          className="shrink-0 gap-1 sm:hidden"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          <SlidersHorizontalIcon className="size-3.5" />
          {t('filters.title')}
          {activeCount > 0 && ` (${activeCount})`}
        </Button>
      </div>

      <div className={cn('flex-wrap items-center gap-2', expanded ? 'flex' : 'hidden sm:flex')}>
        <Facet label={t('filters.author')} value={filters.author} options={authorOpts} onChange={(v) => onFilters({ author: v })} />
        <Facet
          label={t('filters.zone')}
          value={filters.zone}
          options={zoneOptions}
          onChange={(v) => onFilters({ zone: v, theme: null })}
        />
        <Facet label={t('filters.theme')} value={filters.theme} options={themeOptions} onChange={(v) => onFilters({ theme: v })} />
        <Facet label={t('filters.owner')} value={filters.owner} options={ownerOptions} onChange={(v) => onFilters({ owner: v })} />
        <Facet label={t('filters.language')} value={filters.language} options={languageOptions} onChange={(v) => onFilters({ language: v })} />
        {readers.length > 0 && (
          <Facet label={t('filters.readBy')} value={filters.readBy} options={readerOptions} onChange={(v) => onFilters({ readBy: v })} />
        )}

        <Select
          value={filters.status}
          onValueChange={(v) => onFilters({ status: v as StatusFilter })}
        >
          <SelectTrigger size="sm" className="w-full sm:w-auto">
            <SelectValue placeholder={t('filters.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filters.status')}</SelectItem>
            <SelectItem value="available">{t('filters.available')}</SelectItem>
            <SelectItem value="borrowed">{t('filters.borrowed')}</SelectItem>
            <SelectItem value="exchange">{t('filters.exchange')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Admin-only: the tool for finishing the catalog from the shelf. */}
        {isAdmin && (
          <Button
            type="button"
            size="sm"
            variant={filters.attention ? 'default' : 'outline'}
            onClick={() => onFilters({ attention: !filters.attention })}
            className="gap-1"
          >
            <TriangleAlertIcon className="size-3.5" /> {t('filters.attention')}
          </Button>
        )}

        {hasActiveFilters(filters) && (
          <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
            <XIcon className="size-3.5" /> {t('catalog.clearFilters')}
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Select value={`${sortKey}:${sortDir}`} onValueChange={(v) => {
            const [key, dir] = v.split(':') as [SortKey, SortDir]
            onSort(key, dir)
          }}>
            <SelectTrigger size="sm" aria-label={t('sort.label')}>
              <SelectValue />
            </SelectTrigger>
            {/* align end so a wide option list opens leftward, not over the view toggle. */}
            <SelectContent align="end">
              <SelectItem value="title:asc">{t('sort.title')} A–Z</SelectItem>
              <SelectItem value="title:desc">{t('sort.title')} Z–A</SelectItem>
              <SelectItem value="author:asc">{t('sort.author')} A–Z</SelectItem>
              <SelectItem value="author:desc">{t('sort.author')} Z–A</SelectItem>
              <SelectItem value="year:asc">{t('sort.year')} ↑</SelectItem>
              <SelectItem value="year:desc">{t('sort.year')} ↓</SelectItem>
            </SelectContent>
          </Select>

          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(v) => v && onView(v as 'cards' | 'table')}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="cards" aria-label={t('view.cards')}>
              <LayoutGridIcon className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label={t('view.table')}>
              <ListIcon className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </div>
  )
}
