import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Book } from '@/api/types'
import { cn } from '@/lib/utils'
import { useVocab } from '@/i18n/vocab'
import { OwnerBadge } from './OwnerBadge'
import { StatusIcons } from './StatusIcons'
import { ZoneEmoji } from './ZoneEmoji'
import type { ZoneColors } from './zoneColors'

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
 */
export function BookTable({
  books,
  zoneColor,
}: {
  books: Book[]
  zoneColor: (zone: string) => ZoneColors
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const open = (book: Book) => navigate(`/book/${encodeURIComponent(book.id)}`)

  return (
    <div className="overflow-hidden rounded-lg border">
      {/* Phone layout: stacked rows. */}
      <ul className="divide-y sm:hidden">
        {books.map((book) => (
          <li key={book.id}>
            <button
              type="button"
              onClick={() => open(book)}
              className={cn(
                'hover:bg-muted/50 flex w-full flex-col gap-1 p-3 text-left',
                book.borrowed && 'bg-muted-foreground/15 opacity-70', // on loan → unavailable
              )}
            >
              <span className="leading-snug font-medium">{book.title}</span>
              <span className="text-muted-foreground text-sm">
                {book.author}
                {book.year ? ` · ${book.year}` : ''}
              </span>
              <div className="mt-0.5 flex items-center gap-2">
                <ThemeChip theme={book.theme} colors={zoneColor(book.zone)} />
                <ZoneEmoji zone={book.zone} />
                <div className="ml-auto flex items-center gap-2">
                  <StatusIcons book={book} />
                  <OwnerBadge owner={book.owner} />
                </div>
              </div>
            </button>
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
                <td className="text-muted-foreground p-3">{book.author}</td>
                <td className="text-muted-foreground p-3 tabular-nums">{book.year ?? '—'}</td>
                <td className="p-3">
                  <ThemeChip theme={book.theme} colors={zoneColor(book.zone)} />
                </td>
                {/* Zone as an emoji (name on hover), between Theme and Owner. */}
                <td className="p-3">
                  <ZoneEmoji zone={book.zone} />
                </td>
                {/* Logo rather than the name — the tooltip names the owner. */}
                <td className="p-3">
                  <OwnerBadge owner={book.owner} />
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
