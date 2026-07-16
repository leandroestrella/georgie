import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HandCoinsIcon, RepeatIcon } from 'lucide-react'
import type { Book } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useVocab } from '@/i18n/vocab'
import { BookCover } from './BookCover'
import { OwnerBadge } from './OwnerBadge'
import type { ZoneColors } from './zoneColors'

/** A single catalog card linking to the book's detail page. */
export function BookCard({ book, colors }: { book: Book; colors: ZoneColors }) {
  const { t } = useTranslation()
  const tv = useVocab()
  return (
    <Link to={`/book/${encodeURIComponent(book.id)}`} className="group">
      <Card className="h-full overflow-hidden p-0 transition-shadow hover:shadow-md">
        <div className="bg-muted relative aspect-[3/4] w-full overflow-hidden">
          <BookCover book={book} colors={colors} className="size-full transition-transform group-hover:scale-[1.03]" />
          <OwnerBadge owner={book.owner} className="absolute bottom-2 left-2" />
        </div>
        <div className="flex flex-col gap-1.5 p-3">
          {book.zone && (
            <span
              className="w-fit rounded-full border px-2 py-0.5 text-[10px] font-medium"
              style={{ background: colors.bg, color: colors.fg, borderColor: colors.border }}
            >
              {tv('theme', book.theme)}
            </span>
          )}
          <h3 className="line-clamp-2 text-sm leading-snug font-medium">{book.title}</h3>
          <p className="text-muted-foreground line-clamp-1 text-xs">
            {book.author}
            {book.year ? ` · ${book.year}` : ''}
          </p>
          {(book.borrowed || book.exchange) && (
            <div className="mt-1 flex flex-wrap gap-1">
              {book.borrowed && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <HandCoinsIcon className="size-3" /> {t('filters.borrowed')}
                </Badge>
              )}
              {book.exchange && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <RepeatIcon className="size-3" /> {t('filters.exchange')}
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}
