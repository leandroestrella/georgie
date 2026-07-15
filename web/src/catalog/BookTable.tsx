import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HandCoinsIcon, RepeatIcon } from 'lucide-react'
import type { Book } from '@/api/types'
import { useVocab } from '@/i18n/vocab'
import type { ZoneColors } from './zoneColors'

/** Compact, scrollable table view of the catalog. Rows link to book detail. */
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

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground border-b text-left text-xs uppercase">
          <tr>
            <th className="p-3 font-medium">{t('sort.title')}</th>
            <th className="p-3 font-medium">{t('book.author')}</th>
            <th className="p-3 font-medium">{t('sort.year')}</th>
            <th className="p-3 font-medium">{t('book.theme')}</th>
            <th className="p-3 font-medium">{t('book.owner')}</th>
            <th className="p-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {books.map((book) => {
            const colors = zoneColor(book.zone)
            return (
              <tr
                key={book.id}
                onClick={() => navigate(`/book/${encodeURIComponent(book.id)}`)}
                className="hover:bg-muted/50 cursor-pointer border-b last:border-0"
              >
                <td className="p-3 font-medium">{book.title}</td>
                <td className="text-muted-foreground p-3">{book.author}</td>
                <td className="text-muted-foreground p-3 tabular-nums">{book.year ?? '—'}</td>
                <td className="p-3">
                  {book.theme && (
                    <span
                      className="inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs"
                      style={{ background: colors.bg, color: colors.fg, borderColor: colors.border }}
                    >
                      {tv('theme', book.theme)}
                    </span>
                  )}
                </td>
                <td className="text-muted-foreground p-3">{book.owner}</td>
                <td className="p-3">
                  <div className="flex gap-1 text-muted-foreground">
                    {book.borrowed && <HandCoinsIcon className="size-4" aria-label={t('filters.borrowed')} />}
                    {book.exchange && <RepeatIcon className="size-4" aria-label={t('filters.exchange')} />}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
