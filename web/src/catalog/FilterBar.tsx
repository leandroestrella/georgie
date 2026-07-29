import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CircleCheckIcon,
  HandCoinsIcon,
  LayoutGridIcon,
  ListIcon,
  RepeatIcon,
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
import { useCatalog } from './CatalogProvider'
import { OwnerBadge } from './OwnerBadge'
import { languageFlag } from './languageFlags'
import { isImageUrl } from './markers'
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
  /** Optional hover tooltip for the option (e.g. a zone's description). */
  title?: string
  /** Optional leading marker (owner logo, zone emoji, theme colour dot). */
  icon?: ReactNode
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
      {/* Cap the width to the longest zone/theme so those show in full, while
          long options (authors) truncate with an ellipsis instead of stretching
          the menu across the screen. min-w-0 lets the label span shrink so its
          `truncate` can kick in; the leading icon stays fixed. */}
      <SelectContent className="max-w-[min(23rem,90vw)] [&_[data-slot=select-item]>span:last-child]:min-w-0">
        <SelectItem value={ALL}>{label}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} title={o.title}>
            {o.icon}
            <span className="min-w-0 truncate">{o.label}</span>
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
  /** Edition languages actually present in the catalog (not the full vocabulary). */
  languages: string[]
  readers: string[]
  onClear: () => void
}

export function FilterBar(props: FilterBarProps) {
  const { filters, onFilters, sortKey, sortDir, onSort, view, onView, taxonomies, authors, languages, readers, onClear } = props
  const { t, i18n } = useTranslation()
  const tv = useVocab()
  const { isAdmin } = useAuth()
  const { zoneColor, zoneDescription, zoneMarker, themeDescription } = useCatalog()

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
  const themesInScope = filters.zone
    ? (taxonomies.zones.find((z) => z.name === filters.zone)?.themes ?? [])
    : taxonomies.zones.flatMap((z) => z.themes)

  // Each theme belongs to a zone; the theme's colour dot follows that zone's colour.
  const themeZone = new Map<string, string>()
  taxonomies.zones.forEach((z) => z.themes.forEach((th) => themeZone.set(th.name, z.name)))

  const zoneOptions = taxonomies.zones.map((z) => {
    const marker = zoneMarker(z.name) // sheet-driven, falls back to the built-in emoji map
    return {
      value: z.name,
      label: tv('zone', z.name),
      title: zoneDescription(z.name, i18n.resolvedLanguage), // localized, shown on hover in the menu
      icon: !marker ? undefined : isImageUrl(marker) ? (
        <img src={marker} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-4 shrink-0 object-contain" />
      ) : (
        <span className="shrink-0 text-base leading-none">{marker}</span>
      ),
    }
  })
  const themeOptions = themesInScope.map((th) => ({
    value: th.name,
    label: tv('theme', th.name),
    title: themeDescription(th.name, i18n.resolvedLanguage), // localized, shown on hover in the menu
    icon: (
      <span
        className="size-2.5 shrink-0 rounded-full"
        style={{ background: zoneColor(themeZone.get(th.name) ?? '').fg }}
      />
    ),
  }))
  const ownerOptions = taxonomies.owners.map((o) => ({
    value: o,
    label: o,
    icon: <OwnerBadge owner={o} className="size-4" />,
  }))
  const languageOptions = languages.map((l) => {
    const flag = languageFlag(l)
    return {
      value: l,
      label: tv('language', l),
      icon: flag ? <span className="shrink-0 text-base leading-none">{flag}</span> : undefined,
    }
  })
  const authorOpts = authors.map((a) => ({ value: a, label: a }))
  const readerOptions = readers.map((r) => ({
    value: r,
    label: r,
    icon: <OwnerBadge owner={r} className="size-4" />, // readers are the same people as owners
  }))

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
            <SelectItem value="available">
              <CircleCheckIcon className="text-muted-foreground size-4 shrink-0" />
              {t('filters.available')}
            </SelectItem>
            <SelectItem value="borrowed">
              <HandCoinsIcon className="text-muted-foreground size-4 shrink-0" />
              {t('filters.borrowed')}
            </SelectItem>
            <SelectItem value="exchange">
              <RepeatIcon className="text-muted-foreground size-4 shrink-0" />
              {t('filters.exchange')}
            </SelectItem>
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
