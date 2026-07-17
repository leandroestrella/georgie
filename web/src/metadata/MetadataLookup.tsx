import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CameraIcon, GlobeIcon, ScanBarcodeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { NO_ISBN } from '@/catalog/constants'
import { isValidIsbn } from '@/catalog/validation'
import { lookupByIsbn, searchBooks, type BookMetadata } from './lookup'
import { BarcodeScanner } from './BarcodeScanner'
import { cameraAvailable } from './scanner'

/** One candidate row in the search results. */
function Candidate({ meta, onPick }: { meta: BookMetadata; onPick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onPick}
      className="hover:bg-muted flex w-full items-start gap-3 rounded-md border p-2 text-left"
    >
      <div className="bg-muted h-20 w-14 shrink-0 overflow-hidden rounded">
        {meta.coverUrl && (
          <img src={meta.coverUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium">{meta.title}</p>
        <p className="text-muted-foreground truncate text-xs">{meta.author || '—'}</p>
        <p className="text-muted-foreground text-xs">
          {[meta.year ?? '—', meta.publisher].filter(Boolean).join(' · ')}
        </p>
        <p className="text-muted-foreground mt-0.5 text-[10px] uppercase">
          {meta.source === 'google' ? 'Google Books' : 'Open Library'}
          {meta.yearIsFirstPublication && ` · ${t('lookup.firstPubWarning')}`}
        </p>
      </div>
    </button>
  )
}

/**
 * "Grab book details from the web" controls for the book form: look up an exact
 * edition by ISBN, or search by title/author and pick from candidates — the path
 * for the third of the catalog that has no ISBN.
 *
 * Applying only ever fills fields the admin left empty (never overwrites), which
 * matches how the sheet's data-prep scripts behave.
 */
export function MetadataLookup({
  isbn,
  title,
  author,
  onApply,
  onIsbnDetected,
}: {
  isbn: string
  title: string
  author: string
  onApply: (meta: BookMetadata) => void
  /** Called when a barcode scan yields an ISBN, so the form can record it. */
  onIsbnDetected: (isbn: string) => void
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState<'isbn' | 'search' | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<BookMetadata[] | null>(null)
  const [scanning, setScanning] = useState(false)

  const hasIsbn = isbn.trim() !== '' && isbn.trim().toUpperCase() !== NO_ISBN && isValidIsbn(isbn)
  const canSearch = title.trim() !== '' || author.trim() !== ''

  const fetchFor = async (value: string) => {
    setBusy('isbn')
    setStatus(null)
    try {
      const meta = await lookupByIsbn(value)
      if (meta) onApply(meta)
      else setStatus(t('lookup.notFound'))
    } finally {
      setBusy(null)
    }
  }

  /**
   * A scan is an explicit assertion that this printing HAS that ISBN, so unlike
   * `onApply` it does overwrite the `N/A` default — then looks it up right away.
   */
  const handleScanned = async (scanned: string) => {
    onIsbnDetected(scanned)
    await fetchFor(scanned)
  }

  const search = async () => {
    setBusy('search')
    setStatus(null)
    try {
      const results = await searchBooks(title, author)
      if (results.length) setCandidates(results)
      else setStatus(t('lookup.noCandidates'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{t('lookup.hint')}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={!hasIsbn || busy !== null}
          onClick={() => void fetchFor(isbn)}
        >
          <ScanBarcodeIcon className="size-3.5" />
          {busy === 'isbn' ? t('lookup.fetching') : t('lookup.fetchByIsbn')}
        </Button>

        {/* Scan the EAN-13 off the back cover — the fast path at the shelf. */}
        {cameraAvailable() && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={busy !== null}
            onClick={() => setScanning(true)}
          >
            <CameraIcon className="size-3.5" />
            {t('scan.button')}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={!canSearch || busy !== null}
          onClick={() => void search()}
        >
          <GlobeIcon className="size-3.5" />
          {busy === 'search' ? t('lookup.searching') : t('lookup.searchWeb')}
        </Button>
      </div>
      {status && <p className="text-muted-foreground text-xs">{status}</p>}

      <BarcodeScanner
        open={scanning}
        onOpenChange={setScanning}
        onDetected={(scanned) => void handleScanned(scanned)}
      />

      <Dialog open={candidates !== null} onOpenChange={(o) => !o && setCandidates(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('lookup.pickTitle')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {(candidates ?? []).map((meta, i) => (
              <Candidate
                key={`${meta.source}-${meta.isbn}-${i}`}
                meta={meta}
                onPick={() => {
                  onApply(meta)
                  setCandidates(null)
                }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
