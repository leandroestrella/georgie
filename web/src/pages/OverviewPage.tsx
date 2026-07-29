import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/auth/AuthProvider'
import { useCatalog } from '@/catalog/CatalogProvider'
import { OwnerBadge } from '@/catalog/OwnerBadge'
import { ZoneEmoji } from '@/catalog/ZoneEmoji'
import { CountPieChart, type PieCount } from '@/catalog/CountPieChart'
import { splitOwners } from '@/catalog/filter'
import { languageFlag } from '@/catalog/languageFlags'
import { LoadingAvatar } from '@/components/LoadingAvatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useVocab } from '@/i18n/vocab'
import type { Book } from '@/api/types'

// Validated 6-slot categorical palette (dataviz skill's reference default,
// light-mode column — georgie's existing chart-adjacent colors, zoneColors.ts,
// are likewise static/non-theme-branching, so this stays consistent with
// that established convention rather than adding new dark-mode machinery).
// Run: node scripts/validate_palette.js "<hexes>" --mode light → ALL CHECKS PASS.
const LANGUAGE_PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300']

const READ_COLOR = '#2a78d6' // validated palette slot 1 (blue)
const UNREAD_COLOR = '#898781' // dataviz skill's "muted (axis/labels)" role
const ORIGINAL_COLOR = '#1baf7a' // validated palette slot 3 (aqua)
const TRANSLATED_COLOR = '#eb6834' // validated palette slot 2 (orange)
const UNKNOWN_COLOR = '#898781' // same muted role as UNREAD_COLOR — "not determined"

/** Counts occurrences of a book field grouped by a key, in place. */
function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const item of items) {
    const k = key(item)
    if (!k) continue
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return counts
}

/** Book counts per zone, grouped from each book's own (derived) zone field. */
function zoneCounts(books: Book[]): Map<string, number> {
  return countBy(books, (b) => b.zone)
}

/** Book counts per theme, scoped to one zone. */
function themeCountsInZone(books: Book[], zone: string): Map<string, number> {
  return countBy(
    books.filter((b) => b.zone === zone),
    (b) => b.theme,
  )
}

/** Book counts per edition language — a book with 2 languages counts in both. */
function languageCounts(books: Book[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const b of books) for (const l of b.language) counts.set(l, (counts.get(l) ?? 0) + 1)
  return counts
}

/** Is this edition in its original language, translated, or is that unknown
 *  (blank `Original language` — already flagged elsewhere by "needs
 *  attention", so it's tracked as its own slice here rather than guessed). */
function originalityCounts(books: Book[]): { original: number; translated: number; unknown: number } {
  let original = 0
  let translated = 0
  let unknown = 0
  for (const b of books) {
    if (!b.originalLanguage.trim()) unknown++
    else if (b.language.includes(b.originalLanguage)) original++
    else translated++
  }
  return { original, translated, unknown }
}

/** A user's stats. Each figure keeps its own denominator so the UI can show
 *  the raw fraction next to the percentage (e.g. "9/16 · 56%"). */
function userStats(books: Book[], user: string) {
  const owned = books.filter((b) => splitOwners(b.owner).includes(user))
  const ownRead = owned.filter((b) => b.readBy.includes(user)).length
  const catalogRead = books.filter((b) => b.readBy.includes(user)).length
  return {
    count: owned.length,
    catalogTotal: books.length,
    // Co-owned books count for every owner, so these can sum past 100%.
    ownedPct: books.length > 0 ? Math.round((owned.length / books.length) * 100) : 0,
    ownRead,
    ownTotal: owned.length,
    ownReadPct: owned.length > 0 ? Math.round((ownRead / owned.length) * 100) : 0,
    catalogRead,
    catalogReadPct: books.length > 0 ? Math.round((catalogRead / books.length) * 100) : 0,
  }
}

/** Light→dark lightness ramp within one hue — a zone's themes are a
 *  breakdown of one category, so they get a sequential (one-hue) treatment
 *  per the dataviz skill, not distinct hues. */
function themeShade(hue: number, index: number, count: number): string {
  const minL = 35
  const maxL = 70
  const l = count <= 1 ? (minL + maxL) / 2 : maxL - (index * (maxL - minL)) / (count - 1)
  return `hsl(${hue} 55% ${l}%)`
}

export function OverviewPage() {
  const { t } = useTranslation()
  const tv = useVocab()
  const { status, isAdmin } = useAuth()
  const { activeBooks, taxonomies, loading, zoneColor } = useCatalog()

  if (status === 'loading' || loading || !taxonomies) {
    return <LoadingAvatar />
  }

  if (!isAdmin) {
    // Same speech-bubble + mascot visual language as LoadingAvatar's bubble,
    // for a sign-in prompt rather than a loading message — this is the one
    // page in georgie that isn't public (the rest of the catalog stays
    // public read), so it's a small, page-local gate, not an app-wide one.
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="relative inline-block rounded-2xl border-2 border-black bg-white px-4 py-2 text-sm font-bold text-black shadow-md">
          {t('overview.signInMessage')}
          <div className="absolute top-full left-1/2 -mt-px -translate-x-1/2">
            <div className="h-0 w-0 border-x-[11px] border-t-[13px] border-x-transparent border-t-black" />
            <div className="absolute top-0 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[9px] border-t-[11px] border-x-transparent border-t-white" />
          </div>
        </div>
        <img src="/georgie.gif" alt="" className="w-64 max-w-[80vw] sm:w-80" />
      </div>
    )
  }

  const byZone = zoneCounts(activeBooks)
  const zonePie: PieCount[] = [...byZone.entries()].map(([zone, count]) => ({
    key: zone,
    label: tv('zone', zone),
    count,
    color: zoneColor(zone).fg,
    href: `/?zone=${encodeURIComponent(zone)}`,
  }))

  const users = taxonomies.users ?? []
  const readCount = activeBooks.filter((b) => b.readBy.length > 0).length
  const readVsUnread: PieCount[] = [
    { key: 'read', label: t('overview.readOverall'), count: readCount, color: READ_COLOR },
    {
      key: 'unread',
      label: t('overview.unreadOverall'),
      count: activeBooks.length - readCount,
      color: UNREAD_COLOR,
    },
  ].filter((c) => c.count > 0)

  const langCounts = [...languageCounts(activeBooks).entries()]
  const languagePie: PieCount[] = langCounts.map(([lang, count], i) => {
    const flag = languageFlag(lang)
    return {
      key: lang,
      label: `${flag ? flag + ' ' : ''}${tv('language', lang)}`,
      count,
      color: LANGUAGE_PALETTE[i % LANGUAGE_PALETTE.length],
      href: `/?lang=${encodeURIComponent(lang)}`,
    }
  })

  const originality = originalityCounts(activeBooks)
  const originalityPie: PieCount[] = [
    { key: 'original', label: t('overview.original'), count: originality.original, color: ORIGINAL_COLOR },
    { key: 'translated', label: t('overview.translated'), count: originality.translated, color: TRANSLATED_COLOR },
    { key: 'unknown', label: t('overview.unknown'), count: originality.unknown, color: UNKNOWN_COLOR },
  ].filter((c) => c.count > 0)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t('overview.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('overview.byTheme')}</CardTitle>
        </CardHeader>
        <CardContent>
          {zonePie.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('overview.empty')}</p>
          ) : (
            // One unified 2-column grid: the zone-level pie is the first cell,
            // so the first zone's theme drill-down sits right beside it
            // (no separate full-width row / blank space), then the rest of
            // the per-zone drill-downs continue filling the grid. items-start
            // so a short cell (few themes) doesn't stretch to match a taller
            // row-mate — each card sizes to its own content.
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-lg border p-3">
                <p className="text-sm font-medium">{t('overview.byZone')}</p>
                <CountPieChart
                  counts={zonePie}
                  ariaLabel="books by zone"
                  otherLabel={t('overview.other')}
                  totalLabel={t('overview.totalBooks')}
                />
              </div>
              {/* Drill-down: each zone's own book count broken down by theme,
                  in a light→dark ramp of that zone's own hue. */}
              {[...byZone.keys()].map((zone) => {
                const themes = [...themeCountsInZone(activeBooks, zone).entries()]
                const hue = zoneColor(zone).hue
                const themePie: PieCount[] = themes.map(([theme, count], i) => ({
                  key: theme,
                  label: tv('theme', theme),
                  count,
                  color: themeShade(hue, i, themes.length),
                  href: `/?theme=${encodeURIComponent(theme)}`,
                }))
                return (
                  <div key={zone} className="flex flex-col gap-1 rounded-lg border p-3">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <ZoneEmoji zone={zone} />
                      {tv('zone', zone)}
                    </p>
                    <CountPieChart
                      counts={themePie}
                      ariaLabel={`books by theme in ${zone}`}
                      otherLabel={t('overview.other')}
                      totalLabel={t('overview.totalBooks')}
                      size="size-16"
                    />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('overview.byLanguage')}</CardTitle>
        </CardHeader>
        <CardContent>
          {languagePie.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('overview.empty')}</p>
          ) : (
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-lg border p-3">
                {/* A book with two languages counts once per language, so
                    these slices sum to more than the book count — hence its
                    own total label rather than the plain "books" one. */}
                <CountPieChart
                  counts={languagePie}
                  ariaLabel="books by language"
                  otherLabel={t('overview.other')}
                  totalLabel={t('overview.totalEditions')}
                />
              </div>
              <div className="flex flex-col gap-1 rounded-lg border p-3">
                <p className="text-sm font-medium">{t('overview.originalVsTranslated')}</p>
                <CountPieChart
                  counts={originalityPie}
                  ariaLabel="books in original language vs translated"
                  otherLabel={t('overview.other')}
                  totalLabel={t('overview.totalBooks')}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('overview.byUser')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {users.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('overview.empty')}</p>
          ) : (
            <>
              <CountPieChart
                counts={readVsUnread}
                ariaLabel="books read overall"
                otherLabel={t('overview.other')}
                totalLabel={t('overview.totalBooks')}
              />
              {/* auto-fit (not a fixed sm:2/lg:3 track count) so 2 users fill
                  the row as 2 wide cards instead of leaving a blank third
                  column — extra columns only appear once there's enough
                  users AND width for another 240px+ card. */}
              <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
                {users.map((user) => {
                  const stats = userStats(activeBooks, user)
                  const ownedHref = `/?owner=${encodeURIComponent(user)}`
                  const ownReadHref = `/?owner=${encodeURIComponent(user)}&reader=${encodeURIComponent(user)}`
                  const catalogReadHref = `/?reader=${encodeURIComponent(user)}`
                  return (
                    <div key={user} className="flex flex-col gap-2 rounded-lg border p-3">
                      <Link to={ownedHref} className="flex items-center gap-1.5 font-medium hover:underline">
                        <OwnerBadge owner={user} className="size-4" />
                        {user}
                      </Link>
                      <p className="text-sm">
                        <span className="text-muted-foreground">{t('overview.bookCount')} </span>
                        <Link to={ownedHref} className="font-medium hover:underline">
                          {stats.count}/{stats.catalogTotal}
                        </Link>
                        <span className="text-muted-foreground"> · {stats.ownedPct}%</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">{t('overview.ownRead')} </span>
                        <Link to={ownReadHref} className="font-medium hover:underline">
                          {stats.ownRead}/{stats.ownTotal}
                        </Link>
                        <span className="text-muted-foreground"> · {stats.ownReadPct}%</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">{t('overview.catalogRead')} </span>
                        <Link to={catalogReadHref} className="font-medium hover:underline">
                          {stats.catalogRead}/{stats.catalogTotal}
                        </Link>
                        <span className="text-muted-foreground"> · {stats.catalogReadPct}%</span>
                      </p>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
