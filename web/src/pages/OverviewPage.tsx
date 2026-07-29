import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/auth/AuthProvider'
import { useCatalog } from '@/catalog/CatalogProvider'
import { OwnerBadge } from '@/catalog/OwnerBadge'
import { ThemePieChart } from '@/catalog/ThemePieChart'
import { splitOwners } from '@/catalog/filter'
import { LoadingAvatar } from '@/components/LoadingAvatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/** Book counts per theme, most-populated first. */
function themeCounts(books: { theme: string }[]): [string, number][] {
  const counts = new Map<string, number>()
  for (const b of books) {
    if (!b.theme) continue
    counts.set(b.theme, (counts.get(b.theme) ?? 0) + 1)
  }
  return [...counts.entries()]
}

/** An owner's stats: how many books they own, and two read-rate percentages. */
function ownerStats(books: { owner: string; readBy: string[] }[], owner: string) {
  const owned = books.filter((b) => splitOwners(b.owner).includes(owner))
  const ownRead = owned.filter((b) => b.readBy.includes(owner)).length
  const catalogRead = books.filter((b) => b.readBy.includes(owner)).length
  return {
    count: owned.length,
    ownReadPct: owned.length > 0 ? Math.round((ownRead / owned.length) * 100) : 0,
    catalogReadPct: books.length > 0 ? Math.round((catalogRead / books.length) * 100) : 0,
  }
}

export function OverviewPage() {
  const { t } = useTranslation()
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

  const counts = themeCounts(activeBooks)
  const zoneOf = (theme: string) => taxonomies.themeToZone[theme] ?? ''

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t('overview.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('overview.byTheme')}</CardTitle>
        </CardHeader>
        <CardContent>
          {counts.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('overview.empty')}</p>
          ) : (
            <ThemePieChart counts={counts} zoneOf={zoneOf} zoneColor={zoneColor} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('overview.byOwner')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {taxonomies.owners.map((owner) => {
            const stats = ownerStats(activeBooks, owner)
            return (
              <div key={owner} className="flex flex-col gap-2 rounded-lg border p-3">
                <Link
                  to={`/?owner=${encodeURIComponent(owner)}`}
                  className="flex items-center gap-1.5 font-medium hover:underline"
                >
                  <OwnerBadge owner={owner} className="size-4" />
                  {owner}
                </Link>
                <p className="text-sm">
                  <span className="text-muted-foreground">{t('overview.bookCount')} </span>
                  <span className="font-medium">{stats.count}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">{t('overview.ownRead')} </span>
                  <span className="font-medium">{stats.ownReadPct}%</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">{t('overview.catalogRead')} </span>
                  <span className="font-medium">{stats.catalogReadPct}%</span>
                </p>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
