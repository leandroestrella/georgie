import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon, ExternalLinkIcon, HandCoinsIcon, RepeatIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useCatalog } from '@/catalog/CatalogProvider'
import { BookCover } from '@/catalog/BookCover'
import { OwnerBadge } from '@/catalog/OwnerBadge'
import { languageFlag } from '@/catalog/languageFlags'
import { ZoneTooltip } from '@/catalog/ZoneEmoji'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { AdminBookActions } from '@/catalog/AdminBookActions'
import { AuthorLinks } from '@/catalog/AuthorLinks'
import { splitOwners } from '@/catalog/filter'
import { CoverAdminActions } from '@/catalog/CoverAdminActions'
import { Badge } from '@/components/ui/badge'
import { LoadingAvatar } from '@/components/LoadingAvatar'
import { isSafeHttpUrl } from '@/catalog/validation'
import { useVocab } from '@/i18n/vocab'

/** One label/value row in the detail sheet; renders nothing when empty. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === '') return null
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

export function BookDetailPage() {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const tv = useVocab()
  const { getBook, loading, zoneColor } = useCatalog()
  const book = getBook(decodeURIComponent(id))
  // The cover URL actually rendered (from BookCover), so admins can save it.
  const [displayedCoverUrl, setDisplayedCoverUrl] = useState<string | null>(null)

  const back = (
    <Link to="/" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm">
      <ArrowLeftIcon className="size-4" /> {t('book.back')}
    </Link>
  )

  if (loading && !book) {
    return (
      <div className="flex flex-col gap-6">
        {back}
        <LoadingAvatar />
      </div>
    )
  }

  if (!book) {
    return (
      <div className="flex flex-col items-start gap-4 py-12">
        <p className="text-muted-foreground">{t('book.notFound')}</p>
        {back}
      </div>
    )
  }

  const colors = zoneColor(book.zone)
  const yearText = book.year
    ? `${book.year}${book.yearPrecision === 'circa' ? ` · ${t('book.firstPublished')}` : ''}`
    : t('book.unknownYear')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {back}
        <div className="flex flex-col items-end gap-2">
          <AdminBookActions book={book} />
          <CoverAdminActions book={book} displayedCoverUrl={displayedCoverUrl} />
        </div>
      </div>

      {/* Capped width trims the empty space on the right. On sm+ the cover column
          drops its fixed aspect ratio and stretches to the text height (object-cover),
          so short covers no longer end above "Read by"/"Reference". Mobile keeps the
          3/4 ratio so the cover doesn't collapse in the single-column stack. */}
      <div className="grid max-w-4xl gap-6 sm:grid-cols-[minmax(0,17rem)_1fr]">
        <div className="bg-muted aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-lg border sm:aspect-auto sm:max-w-none">
          <BookCover book={book} colors={colors} className="size-full" onResolved={setDisplayedCoverUrl} />
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-2xl leading-tight font-semibold">{book.title}</h1>
            <p className="text-muted-foreground mt-1">
              <AuthorLinks author={book.author} className="hover:text-foreground hover:underline" />
              {' · '}
              {yearText}
            </p>
          </div>

          {/* Zone and theme, below the author/year — independently clickable. */}
          {book.zone && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to={`/?zone=${encodeURIComponent(book.zone)}`}
                    className="rounded-full border px-2.5 py-0.5 text-xs font-medium hover:brightness-95"
                    style={{ background: colors.bg, color: colors.fg, borderColor: colors.border }}
                  >
                    {tv('zone', book.zone)}
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <ZoneTooltip zone={book.zone} />
                </TooltipContent>
              </Tooltip>
              <span className="text-muted-foreground text-xs">·</span>
              <Link
                to={`/?theme=${encodeURIComponent(book.theme)}`}
                className="rounded-full border px-2.5 py-0.5 text-xs font-medium hover:brightness-95"
                style={{ background: colors.bg, color: colors.fg, borderColor: colors.border }}
              >
                {tv('theme', book.theme)}
              </Link>
            </div>
          )}

          {(book.borrowed || book.exchange || book.archived) && (
            <div className="flex flex-wrap gap-2">
              {book.archived && <Badge variant="outline" className="text-destructive">{t('admin.archivedBadge')}</Badge>}
              {book.borrowed && (
                <Badge variant="secondary" className="gap-1">
                  <HandCoinsIcon className="size-3.5" />
                  {t('book.borrowedBy', { name: book.borrowerName || '—' })}
                  {' · '}
                  {book.loanDate ? t('book.loanSince', { date: book.loanDate }) : t('book.loanSinceUnknown')}
                </Badge>
              )}
              {book.exchange && (
                <Badge variant="outline" className="gap-1">
                  <RepeatIcon className="size-3.5" /> {t('book.forExchange')}
                </Badge>
              )}
            </div>
          )}

          <dl className="divide-y">
            <Row label={t('book.publisher')}>{book.publisher}</Row>
            <Row label={t('book.language')}>
              {book.language.length > 0 ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {book.language.map((l) => {
                    const flag = languageFlag(l)
                    return (
                      <Link
                        key={l}
                        to={`/?lang=${encodeURIComponent(l)}`}
                        className="inline-flex items-center gap-1.5 hover:underline"
                      >
                        {flag && <span className="text-[1.05rem] leading-none">{flag}</span>}
                        {tv('language', l)}
                      </Link>
                    )
                  })}
                </div>
              ) : (
                ''
              )}
            </Row>
            <Row label={t('book.originalLanguage')}>
              {book.originalLanguage ? (
                <span className="inline-flex items-center gap-1.5">
                  {languageFlag(book.originalLanguage) && (
                    <span className="text-[1.05rem] leading-none">{languageFlag(book.originalLanguage)}</span>
                  )}
                  {tv('language', book.originalLanguage)}
                </span>
              ) : (
                ''
              )}
            </Row>
            <Row label={t('book.isbn')}>
              {book.isbn && book.isbn.toUpperCase() !== 'N/A' ? book.isbn : t('book.noIsbn')}
            </Row>
            <Row label={t('book.owner')}>
              {splitOwners(book.owner).length > 0 ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {splitOwners(book.owner).map((o) => (
                    <Link
                      key={o}
                      to={`/?owner=${encodeURIComponent(o)}`}
                      className="inline-flex items-center gap-1.5 hover:underline"
                    >
                      <OwnerBadge owner={o} className="size-4" />
                      {o}
                    </Link>
                  ))}
                </div>
              ) : (
                ''
              )}
            </Row>
            <Row label={t('book.readBy')}>
              {book.readBy.length > 0 ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {book.readBy.map((r) => (
                    <Link
                      key={r}
                      to={`/?reader=${encodeURIComponent(r)}`}
                      className="inline-flex items-center gap-1.5 hover:underline"
                    >
                      <OwnerBadge owner={r} className="size-4" />
                      {r}
                    </Link>
                  ))}
                </div>
              ) : (
                ''
              )}
            </Row>
            <Row label={t('book.reference')}>
              {isSafeHttpUrl(book.referenceUrl) && (
                <a
                  href={book.referenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-1 hover:underline"
                >
                  {t('book.openReference')} <ExternalLinkIcon className="size-3.5" />
                </a>
              )}
            </Row>
          </dl>
        </div>
      </div>
    </div>
  )
}
