import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon, Undo2Icon } from 'lucide-react'
import { restoreBook } from '@/api/client'
import { useAuth } from '@/auth/AuthProvider'
import { useCatalog } from '@/catalog/CatalogProvider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Admin-only view of archived (soft-deleted) books, with restore. Archived books
 * are hidden from the public catalog entirely — nothing is ever destroyed.
 */
export function ArchivedPage() {
  const { t } = useTranslation()
  const { isAdmin } = useAuth()
  const { archivedBooks, loading, applyBook } = useCatalog()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isAdmin && !loading) return <Navigate to="/" replace />

  const restore = async (id: string) => {
    setBusy(id)
    setError(null)
    try {
      applyBook(await restoreBook(id))
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to="/" className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm">
        <ArrowLeftIcon className="size-4" /> {t('book.back')}
      </Link>

      <h1 className="text-2xl font-semibold">{t('admin.archived')}</h1>
      {error && <p className="text-destructive text-sm">{error}</p>}

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : archivedBooks.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">{t('admin.archivedEmpty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b text-left text-xs uppercase">
              <tr>
                <th className="p-3 font-medium">{t('sort.title')}</th>
                <th className="p-3 font-medium">{t('book.author')}</th>
                <th className="p-3 font-medium">{t('sort.year')}</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {archivedBooks.map((book) => (
                <tr key={book.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">
                    <Link to={`/book/${encodeURIComponent(book.id)}`} className="hover:underline">
                      {book.title}
                    </Link>
                  </td>
                  <td className="text-muted-foreground p-3">{book.author}</td>
                  <td className="text-muted-foreground p-3 tabular-nums">{book.year ?? '—'}</td>
                  <td className="p-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === book.id}
                      onClick={() => void restore(book.id)}
                      className="gap-1"
                    >
                      <Undo2Icon className="size-3.5" />
                      {busy === book.id ? t('form.saving') : t('admin.restore')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
