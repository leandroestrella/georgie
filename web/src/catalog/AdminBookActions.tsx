import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArchiveIcon, PencilIcon, Undo2Icon } from 'lucide-react'
import { deleteBook, restoreBook } from '@/api/client'
import type { Book } from '@/api/types'
import { useAuth } from '@/auth/AuthProvider'
import { useAdminAction } from '@/catalog/useAdminAction'
import { Button } from '@/components/ui/button'
import { LoanControl } from './LoanControl'
import { ExchangeControl } from './ExchangeControl'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

/**
 * Edit / archive / restore controls, rendered only for signed-in admins. This is
 * cosmetic — the backend independently verifies the caller on every write.
 * "Archive" is a soft delete: the book leaves the public catalog but is never
 * destroyed, and can be restored from the Archived view.
 *
 * A book `in transit` (§3.9) is archived automatically — once mailed out it's
 * gone for good, unlike a loan — so it needs its exchange control (specifically
 * "Exchange received") to stay reachable even while archived, and its plain
 * "Restore" hidden: restoring would leave it active again with a dangling
 * `in transit` status, which isn't a real state to come back to.
 */
export function AdminBookActions({ book }: { book: Book }) {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const { run, busy, error } = useAdminAction()

  if (!isAdmin) return null

  const inTransit = book.exchangeStatus === 'in transit'

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline" className="gap-1">
          <Link to={`/book/${encodeURIComponent(book.id)}/edit`}>
            <PencilIcon className="size-3.5" /> {t('admin.edit')}
          </Link>
        </Button>

        {!book.archived && <LoanControl book={book} />}

        {book.archived ? (
          !inTransit && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={busy}
              onClick={() => void run(() => restoreBook(book.id))}
            >
              <Undo2Icon className="size-3.5" /> {t('admin.restore')}
            </Button>
          )
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-destructive gap-1" disabled={busy}>
                <ArchiveIcon className="size-3.5" /> {t('admin.archive')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('admin.confirmArchiveTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('admin.confirmArchiveBody', { title: book.title })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('form.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => void run(() => deleteBook(book.id), () => navigate('/'))}>
                  {t('admin.archive')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      {(!book.archived || inTransit) && <ExchangeControl book={book} />}
    </div>
  )
}
