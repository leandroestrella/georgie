import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RepeatIcon, Undo2Icon } from 'lucide-react'
import { completeExchange, setExchange } from '@/api/client'
import type { Book } from '@/api/types'
import { useCatalog } from '@/catalog/CatalogProvider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Admin exchange-stage control (§3.9): offered → confirmed → in transit →
 * received. Each stage renders its next transition plus a withdraw action.
 * "Exchange confirmed" opens a dialog asking only for the partner's name —
 * saving always hands off to the add form (`?exchangeWith=<id>`), since
 * confirming an exchange means the incoming book is now known and should be
 * catalogued right away. `BookFormPage` links the two books and marks the
 * incoming one `Borrowed` (not yet on the shelf). "Exchange received"
 * archives this book and releases the linked incoming book in one call.
 */
export function ExchangeControl({ book }: { book: Book }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { applyBook } = useCatalog()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [partner, setPartner] = useState(book.exchangeNote)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<Book>, after?: (b: Book) => void): Promise<boolean> => {
    setBusy(true)
    setError(null)
    try {
      const b = await fn()
      applyBook(b)
      after?.(b)
      return true
    } catch (e) {
      setError(String(e))
      return false
    } finally {
      setBusy(false)
    }
  }

  const openConfirmDialog = () => {
    setPartner(book.exchangeNote)
    setError(null)
    setConfirmOpen(true)
  }

  const saveConfirmed = () =>
    run(() => setExchange(book.id, { status: 'confirmed', note: partner.trim(), link: book.exchangeLink }))

  const withdraw = <Button
    size="sm"
    variant="outline"
    className="gap-1"
    disabled={busy}
    onClick={() => void run(() => setExchange(book.id, null))}
  >
    <Undo2Icon className="size-3.5" /> {t('exchange.withdraw')}
  </Button>

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {book.exchangeStatus === '' && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={busy}
            onClick={() => void run(() => setExchange(book.id, { status: 'offered' }))}
          >
            <RepeatIcon className="size-3.5" /> {t('exchange.offer')}
          </Button>
        )}

        {book.exchangeStatus === 'offered' && (
          <>
            <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={openConfirmDialog}>
              <RepeatIcon className="size-3.5" /> {t('exchange.confirm')}
            </Button>
            {withdraw}
          </>
        )}

        {book.exchangeStatus === 'confirmed' && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  setExchange(book.id, { status: 'in transit', note: book.exchangeNote, link: book.exchangeLink }),
                )
              }
            >
              <RepeatIcon className="size-3.5" /> {t('exchange.markInTransit')}
            </Button>
            {withdraw}
          </>
        )}

        {book.exchangeStatus === 'in transit' && (
          <>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1" disabled={busy}>
                  <RepeatIcon className="size-3.5" /> {t('exchange.received')}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('exchange.receivedDialog.title')}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('exchange.receivedDialog.body', { title: book.title })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('form.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void run(() => completeExchange(book.id), () => navigate('/'))}
                  >
                    {t('exchange.received')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {withdraw}
          </>
        )}
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('exchange.confirmDialog.title')}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exchangePartner">{t('exchange.confirmDialog.partnerLabel')}</Label>
              <Input
                id="exchangePartner"
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                placeholder={t('exchange.confirmDialog.partnerPlaceholder')}
                autoFocus
              />
              <p className="text-muted-foreground text-xs">{t('exchange.confirmDialog.partnerHint')}</p>
            </div>
            {error && <p className="text-destructive text-xs">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>
              {t('form.cancel')}
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                void saveConfirmed().then((ok) => {
                  if (!ok) return
                  setConfirmOpen(false)
                  navigate(`/book/new?exchangeWith=${encodeURIComponent(book.id)}`)
                })
              }
            >
              {busy ? t('form.saving') : t('form.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
