import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon } from 'lucide-react'
import { addBook, setExchange, setLoan, updateBook } from '@/api/client'
import type { NewBook } from '@/api/types'
import { useAuth } from '@/auth/AuthProvider'
import { BookForm, emptyDraft } from '@/catalog/BookForm'
import { useCatalog } from '@/catalog/CatalogProvider'
import { LoadingAvatar } from '@/components/LoadingAvatar'

/**
 * Add (`/book/new`) and edit (`/book/:id/edit`) pages. Admin-only in the UI; the
 * backend independently rejects writes from anyone not on the allowlist.
 *
 * Add also supports `?exchangeWith=<id>` (§3.9): reached from an "add the
 * incoming book" shortcut on the outgoing book's confirmed-exchange dialog.
 * On save, the new book is marked `Borrowed` (reusing the loan flag to mean
 * "not yet on the shelf") with the outgoing book's exchange note as the
 * borrower, and the two books are linked by id — the outgoing book's
 * "Exchange received" action later clears both in one step.
 */
export function BookFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const exchangeWith = mode === 'add' ? searchParams.get('exchangeWith') : null
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAdmin, owner } = useAuth()
  const { getBook, taxonomies, loading, applyBook } = useCatalog()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const existing = mode === 'edit' ? getBook(decodeURIComponent(id)) : undefined
  const outgoing = exchangeWith ? getBook(exchangeWith) : undefined

  // Cosmetic guard; enforcement is server-side.
  if (!isAdmin && !loading) return <Navigate to="/" replace />

  if (loading || !taxonomies || (mode === 'edit' && !existing)) {
    return <LoadingAvatar />
  }

  const initial = mode === 'edit' && existing ? existing : emptyDraft(owner)

  const handleSubmit = async (draft: NewBook) => {
    setSubmitting(true)
    setError(null)
    try {
      const saved =
        mode === 'edit' && existing
          ? await updateBook(existing.id, draft)
          : await addBook(draft)
      applyBook(saved)

      if (mode === 'add' && exchangeWith) {
        applyBook(await setLoan(saved.id, { borrowerName: outgoing?.exchangeNote || '' }))
        applyBook(await updateBook(saved.id, { exchangeLink: exchangeWith }))
        applyBook(
          await setExchange(exchangeWith, { status: 'confirmed', note: outgoing?.exchangeNote ?? '', link: saved.id }),
        )
        navigate(`/book/${encodeURIComponent(exchangeWith)}`)
        return
      }

      navigate(`/book/${encodeURIComponent(saved.id)}`)
    } catch (e) {
      setError(String(e))
    } finally {
      setSubmitting(false)
    }
  }

  const backTo = mode === 'edit' && existing ? `/book/${encodeURIComponent(existing.id)}` : '/'

  return (
    <div className="flex flex-col gap-6">
      <Link to={backTo} className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm">
        <ArrowLeftIcon className="size-4" /> {t('book.back')}
      </Link>

      <h1 className="text-2xl font-semibold">
        {mode === 'edit' ? t('form.editTitle') : t('form.addTitle')}
      </h1>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <BookForm
        initial={initial}
        taxonomies={taxonomies}
        submitting={submitting}
        onSubmit={(d) => void handleSubmit(d)}
        onCancel={() => navigate(backTo)}
      />
    </div>
  )
}
