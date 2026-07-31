import { useState } from 'react'
import type { Book } from '@/api/types'
import { useBusy } from '@/components/BusyProvider'
import { useCatalog } from '@/catalog/CatalogProvider'

/**
 * The shared "run an admin write" pattern used by loan/exchange/archive/cover
 * controls: local busy/error state for the triggering control (e.g. to
 * disable its own buttons), the app-wide busy signal that drives
 * `LoadingOverlay`, and applying the returned book to the catalog cache on
 * success.
 */
export function useAdminAction() {
  const { applyBook } = useCatalog()
  const globalBusy = useBusy()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (fn: () => Promise<Book>, after?: (book: Book) => void): Promise<boolean> => {
    setBusy(true)
    setError(null)
    globalBusy.begin()
    try {
      const book = await fn()
      applyBook(book)
      after?.(book)
      return true
    } catch (e) {
      setError(String(e))
      return false
    } finally {
      setBusy(false)
      globalBusy.end()
    }
  }

  return { run, busy, error, setError }
}
