import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { HandCoinsIcon, Undo2Icon } from 'lucide-react'
import { setLoan } from '@/api/client'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Today as ISO `YYYY-MM-DD`, for the loan-date default. */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Admin lend / return control. Lending opens a dialog for the borrower (first
 * name / nickname only — the catalog is public) and the loan date. Returning
 * clears the loan. Writes go through the token-gated `setLoan` handler.
 */
export function LoanControl({ book }: { book: Book }) {
  const { t } = useTranslation()
  const { applyBook } = useCatalog()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(book.borrowerName)
  const [date, setDate] = useState(book.loanDate || today())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<Book>, onDone?: () => void) => {
    setBusy(true)
    setError(null)
    try {
      applyBook(await fn())
      onDone?.()
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const openDialog = () => {
    setName(book.borrowerName)
    setDate(book.loanDate || today())
    setError(null)
    setOpen(true)
  }

  return (
    <>
      {book.borrowed ? (
        <>
          <Button size="sm" variant="outline" className="gap-1" onClick={openDialog} disabled={busy}>
            <HandCoinsIcon className="size-3.5" /> {t('loan.editLoan')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={busy}
            onClick={() => void run(() => setLoan(book.id, null))}
          >
            <Undo2Icon className="size-3.5" /> {t('loan.return')}
          </Button>
        </>
      ) : (
        <Button size="sm" variant="outline" className="gap-1" onClick={openDialog} disabled={busy}>
          <HandCoinsIcon className="size-3.5" /> {t('loan.lend')}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('loan.dialogTitle')}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="borrower">{t('loan.borrower')}</Label>
              <Input
                id="borrower"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('loan.borrowerPlaceholder')}
                autoFocus
              />
              <p className="text-muted-foreground text-xs">{t('loan.borrowerHint')}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loanDate">{t('loan.loanDate')}</Label>
              <Input id="loanDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            {error && <p className="text-destructive text-xs">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              {t('form.cancel')}
            </Button>
            <Button
              disabled={busy || !name.trim()}
              onClick={() =>
                void run(
                  () => setLoan(book.id, { borrowerName: name.trim(), loanDate: date }),
                  () => setOpen(false),
                )
              }
            >
              {busy ? t('form.saving') : t('form.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
