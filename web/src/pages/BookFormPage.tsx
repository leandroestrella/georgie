import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeftIcon } from 'lucide-react'
import { addBook, updateBook } from '@/api/client'
import type { NewBook } from '@/api/types'
import { useAuth } from '@/auth/AuthProvider'
import { BookForm, emptyDraft } from '@/catalog/BookForm'
import { useCatalog } from '@/catalog/CatalogProvider'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Add (`/book/new`) and edit (`/book/:id/edit`) pages. Admin-only in the UI; the
 * backend independently rejects writes from anyone not on the allowlist.
 */
export function BookFormPage({ mode }: { mode: 'add' | 'edit' }) {
  const { id = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAdmin, owner } = useAuth()
  const { getBook, taxonomies, loading, applyBook } = useCatalog()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const existing = mode === 'edit' ? getBook(decodeURIComponent(id)) : undefined

  // Cosmetic guard; enforcement is server-side.
  if (!isAdmin && !loading) return <Navigate to="/" replace />

  if (loading || !taxonomies || (mode === 'edit' && !existing)) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
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
