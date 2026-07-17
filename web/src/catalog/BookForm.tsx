import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Book, NewBook, Taxonomies } from '@/api/types'
import { makeId } from '@/api/ids'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MultiSelect } from '@/components/MultiSelect'
import { MetadataLookup } from '@/metadata/MetadataLookup'
import type { BookMetadata } from '@/metadata/lookup'
import { useVocab } from '@/i18n/vocab'
import { NO_ISBN } from './constants'
import { validateBook, type BookErrors } from './validation'

/** A blank draft for the Add form. */
export function emptyDraft(owner = ''): NewBook {
  return {
    title: '',
    author: '',
    year: null,
    yearPrecision: '',
    publisher: '',
    isbn: NO_ISBN,
    language: [],
    originalLanguage: '',
    coverUrl: '',
    theme: '',
    owner,
    referenceUrl: '',
    readBy: [],
    borrowed: false,
    borrowerName: '',
    loanDate: '',
    exchange: false,
    archived: false,
  }
}

/** One labelled field row. */
function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-destructive text-xs">{t(error)}</p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  )
}

/**
 * Add/edit form for a book.
 *
 * Zone is never edited directly — picking a Theme (grouped by its Zone) is what
 * determines it, and the backend writes the derived parent. The ID is shown as a
 * preview on Add only: it is generated once at creation and is immutable after.
 */
export function BookForm({
  initial,
  taxonomies,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial: NewBook | Book
  taxonomies: Taxonomies
  submitting: boolean
  onSubmit: (draft: NewBook) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const tv = useVocab()
  const [draft, setDraft] = useState<NewBook>({ ...initial })
  const [errors, setErrors] = useState<BookErrors>({})
  const isEdit = 'id' in initial

  const set = <K extends keyof NewBook>(key: K, value: NewBook[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  /**
   * Applies looked-up metadata, filling ONLY fields the admin left empty — the
   * same "never overwrite" rule the sheet's data-prep scripts follow, so this is
   * safe to run on an existing book to fill a missing year or cover.
   *
   * The ISBN is deliberately never auto-filled: `N/A` is a deliberate assertion
   * that a printing has none, and we must not silently contradict it.
   */
  const applyMetadata = (m: BookMetadata) =>
    setDraft((d) => {
      const takesYear = d.year === null && m.year !== null
      return {
        ...d,
        title: d.title.trim() || m.title,
        author: d.author.trim() || m.author,
        year: d.year ?? m.year,
        // A first-publication year is exactly what `circa` means in this catalog.
        yearPrecision: takesYear && m.yearIsFirstPublication ? 'circa' : d.yearPrecision,
        publisher: d.publisher.trim() || m.publisher,
        language: d.language.length ? d.language : m.language,
        coverUrl: d.coverUrl.trim() || m.coverUrl,
        isbn: d.isbn.trim() === '' ? m.isbn : d.isbn,
      }
    })

  const noIsbn = draft.isbn.trim().toUpperCase() === NO_ISBN
  const zoneOfTheme = draft.theme ? (taxonomies.themeToZone[draft.theme] ?? '') : ''

  const languageOptions = useMemo(
    () => taxonomies.languages.map((l) => ({ value: l, label: tv('language', l) })),
    [taxonomies.languages, tv],
  )
  const readerOptions = useMemo(
    () => taxonomies.owners.map((o) => ({ value: o, label: o })),
    [taxonomies.owners],
  )

  const idPreview = !isEdit ? makeId(draft.title, draft.author, draft.year) : ''

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const found = validateBook(draft)
    setErrors(found)
    if (Object.keys(found).length === 0) onSubmit(draft)
  }

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-5">
      <MetadataLookup
        isbn={draft.isbn}
        title={draft.title}
        author={draft.author}
        onApply={applyMetadata}
        onIsbnDetected={(scanned) => set('isbn', scanned)}
      />

      <Field id="title" label={`${t('form.title')} *`} error={errors.title}>
        <Input id="title" value={draft.title} onChange={(e) => set('title', e.target.value)} autoFocus />
      </Field>

      <Field id="author" label={t('form.author')}>
        <Input id="author" value={draft.author} onChange={(e) => set('author', e.target.value)} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="year"
          label={t('form.year')}
          error={errors.year}
          hint={t('form.yearHint')}
        >
          <Input
            id="year"
            inputMode="numeric"
            value={draft.year ?? ''}
            onChange={(e) => {
              const v = e.target.value.trim()
              set('year', v === '' ? null : Number(v))
            }}
          />
        </Field>

        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.yearPrecision === 'circa'}
              onCheckedChange={(c) => set('yearPrecision', c ? 'circa' : '')}
            />
            {t('form.circa')}
          </label>
        </div>
      </div>

      <Field id="publisher" label={t('form.publisher')}>
        <Input id="publisher" value={draft.publisher} onChange={(e) => set('publisher', e.target.value)} />
      </Field>

      <Field id="isbn" label={t('form.isbn')} error={errors.isbn} hint={t('form.isbnHint')}>
        <div className="flex flex-col gap-2">
          <Input
            id="isbn"
            value={noIsbn ? '' : draft.isbn}
            disabled={noIsbn}
            placeholder={noIsbn ? t('form.noIsbn') : '978…'}
            onChange={(e) => set('isbn', e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={noIsbn} onCheckedChange={(c) => set('isbn', c ? NO_ISBN : '')} />
            {t('form.noIsbn')}
          </label>
        </div>
      </Field>

      <Field id="theme" label={`${t('form.theme')} *`} error={errors.theme} hint={zoneOfTheme ? `${t('form.zone')}: ${tv('zone', zoneOfTheme)}` : t('form.themeHint')}>
        <Select value={draft.theme || undefined} onValueChange={(v) => set('theme', v)}>
          <SelectTrigger id="theme" className="w-full">
            <SelectValue placeholder={t('form.select')} />
          </SelectTrigger>
          <SelectContent>
            {taxonomies.zones.map((zone) => (
              <SelectGroup key={zone.name}>
                <SelectLabel>{tv('zone', zone.name)}</SelectLabel>
                {zone.themes.map((theme) => (
                  <SelectItem key={theme} value={theme}>
                    {tv('theme', theme)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="language" label={t('form.language')}>
          <MultiSelect
            id="language"
            options={languageOptions}
            values={draft.language}
            onChange={(v) => set('language', v)}
            placeholder={t('form.select')}
          />
        </Field>

        <Field id="originalLanguage" label={t('form.originalLanguage')}>
          <Select
            value={draft.originalLanguage || undefined}
            onValueChange={(v) => set('originalLanguage', v)}
          >
            <SelectTrigger id="originalLanguage" className="w-full">
              <SelectValue placeholder={t('form.select')} />
            </SelectTrigger>
            <SelectContent>
              {taxonomies.languages.map((l) => (
                <SelectItem key={l} value={l}>
                  {tv('language', l)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="owner" label={t('form.owner')}>
          <Select value={draft.owner || undefined} onValueChange={(v) => set('owner', v)}>
            <SelectTrigger id="owner" className="w-full">
              <SelectValue placeholder={t('form.select')} />
            </SelectTrigger>
            <SelectContent>
              {taxonomies.owners.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="readBy" label={t('form.readBy')}>
          <MultiSelect
            id="readBy"
            options={readerOptions}
            values={draft.readBy}
            onChange={(v) => set('readBy', v)}
            placeholder={t('form.select')}
          />
        </Field>
      </div>

      <Field id="coverUrl" label={t('form.coverUrl')} hint={t('form.coverHint')}>
        <Input id="coverUrl" value={draft.coverUrl} onChange={(e) => set('coverUrl', e.target.value)} />
      </Field>

      <Field id="referenceUrl" label={t('form.referenceUrl')}>
        <Input id="referenceUrl" value={draft.referenceUrl} onChange={(e) => set('referenceUrl', e.target.value)} />
      </Field>

      <label className="flex w-fit items-center gap-2 text-sm">
        <Checkbox checked={draft.exchange} onCheckedChange={(c) => set('exchange', !!c)} />
        {t('form.exchange')}
      </label>

      {!isEdit && idPreview && (
        <p className="text-muted-foreground text-xs">
          {t('form.idPreview')} <span className="font-mono">{idPreview}</span>
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? t('form.saving') : t('form.save')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          {t('form.cancel')}
        </Button>
      </div>
    </form>
  )
}
