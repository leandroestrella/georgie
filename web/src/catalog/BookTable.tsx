import { Link, useNavigate } from 'react-router-dom'
import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Book } from '@/api/types'
import { cn } from '@/lib/utils'
import { useVocab } from '@/i18n/vocab'
import { OwnerBadge } from './OwnerBadge'
import { StatusIcons } from './StatusIcons'
import { ZoneEmoji } from './ZoneEmoji'
import type { ZoneColors } from './zoneColors'

const enc = encodeURIComponent
/** Keep a facet link from also triggering the row's open-the-book handler. */
const stop = (e: MouseEvent) => e.stopPropagation()

/** The coloured theme chip, shared by both layouts. */
function ThemeChip({ theme, colors }: { theme: string; colors: ZoneColors }) {
  const tv = useVocab()
  if (!theme) return null
  return (
    <span
      className="inline-block w-fit whitespace-nowrap rounded-full border px-2 py-0.5 text-xs"
      style={{ background: colors.bg, color: colors.fg, borderColor: colors.border }}
    >
      {tv('theme', theme)}
    </span>
  )
}

/**
 * Catalog list view. Two layouts from one component:
 *  - a real table on `sm+` screens;
 *  - a stacked list on phones, where a 6-column table is unreadable (it needs
 *    ~620px and titles/authors otherwise wrap to many lines). Each book becomes
 *    title / author·year / theme·owner·status — full width, no sideways scroll.
 *
 * The author/theme/zone/owner are links that filter the catalog (like the detail
 * page). On phones the row uses the stretched-link pattern; on desktop the row
 * navigates on click and the facet links stop propagation.
 */
export function BookTable({
  books,
  zoneColor,
}: {
  books: Book[]
  zoneColor: (zone: string) => ZoneColors
}) {
  const { t } = useTranslation()
  const tv = useVocab()
  const navigate = useNavigate()
  const open = (book: Book) => navigate(`/book/${enc(book.id)}`)

  return (
    <div className="overflow-hidden rounded-lg border">
      {/* Phone layout: stacked rows. The title link's ::after covers the row so
          any empty area opens the book; the facet links sit above it (z-[1]). */}
      <ul className="divide-y sm:hidden">
        {books.map((book) => (
          <li
            key={book.id}
            className={cn(
              'hover:bg-muted/50 relative flex flex-col gap-1 p-3',
              book.borrowed && 'bg-muted-foreground/15 opacity-70', // on loan → unavailable
            )}
          >
            <Link
              to={`/book/${enc(book.id)}`}
              aria-label={book.title}
              className="font-medium after:absolute after:inset-0"
            >
              {book.title}
            </Link>
            <span className="text-muted-foreground text-sm">
              {book.author && (
                <Link to={`/?author=${enc(book.author)}`} className="relative z-[1] hover:underline">
                  {book.author}
                </Link>
              )}
              {book.year ? `${book.author ? ' · ' : ''}${book.year}` : ''}
            </span>
            <div className="mt-0.5 flex items-center gap-2">
              {book.theme && (
                <Link to={`/?theme=${enc(book.theme)}`} className="relative z-[1]">
                  <ThemeChip theme={book.theme} colors={zoneColor(book.zone)} />
                </Link>
              )}
              {book.zone && (
                <Link to={`/?zone=${enc(book.zone)}`} className="relative z-[1]" aria-label={tv('zone', book.zone)}>
                  <ZoneEmoji zone={book.zone} />
                </Link>
              )}
              <div className="ml-auto flex items-center gap-2">
                <span className="relative z-[1]">
                  <StatusIcons book={book} />
                </span>
                {book.owner && (
                  <Link to={`/?owner=${enc(book.owner)}`} className="relative z-[1]">
                    <OwnerBadge owner={book.owner} />
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop / tablet layout: real table. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground border-b text-left text-xs uppercase">
            <tr>
              <th className="p-3 font-medium">{t('sort.title')}</th>
              <th className="p-3 font-medium">{t('book.author')}</th>
              <th className="p-3 font-medium">{t('sort.year')}</th>
              <th className="p-3 font-medium">{t('book.theme')}</th>
              <th className="p-3 font-medium">{t('filters.zone')}</th>
              <th className="p-3 font-medium">{t('book.owner')}</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr
                key={book.id}
                onClick={() => open(book)}
                className={cn(
                  'hover:bg-muted/50 cursor-pointer border-b last:border-0',
                  book.borrowed && 'bg-muted-foreground/15 opacity-70', // on loan → unavailable
                )}
              >
                <td className="p-3 font-medium">{book.title}</td>
                <td className="text-muted-foreground p-3">
                  {book.author && (
                    <Link
                      to={`/?author=${enc(book.author)}`}
                      onClick={stop}
                      className="hover:text-foreground hover:underline"
                    >
                      {book.author}
                    </Link>
                  )}
                </td>
                <td className="text-muted-foreground p-3 tabular-nums">{book.year ?? '—'}</td>
                <td className="p-3">
                  {book.theme && (
                    <Link to={`/?theme=${enc(book.theme)}`} onClick={stop} className="hover:brightness-95">
                      <ThemeChip theme={book.theme} colors={zoneColor(book.zone)} />
                    </Link>
                  )}
                </td>
                {/* Zone as an emoji (name on hover), between Theme and Owner. */}
                <td className="p-3">
                  {book.zone && (
                    <Link to={`/?zone=${enc(book.zone)}`} onClick={stop} aria-label={tv('zone', book.zone)}>
                      <ZoneEmoji zone={book.zone} />
                    </Link>
                  )}
                </td>
                {/* Logo rather than the name — the tooltip names the owner. */}
                <td className="p-3">
                  {book.owner && (
                    <Link to={`/?owner=${enc(book.owner)}`} onClick={stop}>
                      <OwnerBadge owner={book.owner} />
                    </Link>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5">
                    <StatusIcons book={book} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
