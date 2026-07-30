import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArchiveIcon,
  ArrowLeftIcon,
  CircleCheckIcon,
  HandCoinsIcon,
  PencilIcon,
  PlusIcon,
  Undo2Icon,
} from 'lucide-react'
import { getHistory } from '@/api/client'
import type { HistoryEntry } from '@/api/types'
import { useAuth } from '@/auth/AuthProvider'
import { OwnerBadge } from '@/catalog/OwnerBadge'
import { LoadingAvatar } from '@/components/LoadingAvatar'
import { useVocab } from '@/i18n/vocab'

const ACTION_ICONS: Record<HistoryEntry['action'], typeof PlusIcon> = {
  add: PlusIcon,
  update: PencilIcon,
  archive: ArchiveIcon,
  restore: Undo2Icon,
  loan: HandCoinsIcon,
  return: CircleCheckIcon,
}

/**
 * `dateStyle`/`timeStyle` can't be combined with `timeZoneName` (throws at
 * runtime) — build the format from individual components instead, so every
 * entry shows in the viewer's own timezone, not a bare UTC timestamp.
 */
function formatTimestamp(iso: string, lang: string): string {
  return new Intl.DateTimeFormat(lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso))
}

/**
 * Admin-only audit log of every catalog write (the `History` tab), newest
 * first — reachable from the header's history icon (admin-only, alongside the
 * Overview link). Each entry links to its book: safe to do unconditionally
 * here since Georgie's "delete" is an archive (the row is never destroyed),
 * unlike a true delete which would need to leave `entityId` blank.
 */
export function HistoryPage() {
  const { t, i18n } = useTranslation()
  const tv = useVocab()
  const { status, isAdmin } = useAuth()
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin) return
    getHistory()
      .then(setEntries)
      .catch((e) => setError(String(e)))
  }, [isAdmin])

  if (status !== 'loading' && !isAdmin) return <Navigate to="/" replace />

  return (
    <div className="flex flex-col gap-6">
      <Link to="/" className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm">
        <ArrowLeftIcon className="size-4" /> {t('book.back')}
      </Link>

      <h1 className="text-2xl font-semibold">{t('history.title')}</h1>
      {error && <p className="text-destructive text-sm">{error}</p>}

      {entries === null ? (
        <LoadingAvatar />
      ) : entries.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center">{t('history.empty')}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {entries.map((entry) => {
            const Icon = ACTION_ICONS[entry.action]
            const body = (
              <div className="flex items-start gap-3 p-3">
                <OwnerBadge owner={entry.actor} className="mt-0.5 size-5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <Icon className="text-muted-foreground mr-1 inline size-3.5 align-[-0.15em]" aria-hidden />
                    {t(`history.action.${entry.action}`, { actor: entry.actor, title: entry.title })}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {entry.author}
                    {entry.theme && ` · ${tv('theme', entry.theme)}`}
                  </p>
                  {entry.changes && <p className="text-muted-foreground mt-1 font-mono text-xs">{entry.changes}</p>}
                </div>
                <time dateTime={entry.timestamp} className="text-muted-foreground shrink-0 text-xs">
                  {formatTimestamp(entry.timestamp, i18n.resolvedLanguage ?? 'en')}
                </time>
              </div>
            )
            return (
              <li key={`${entry.timestamp}_${entry.entityId}_${entry.action}`}>
                {entry.entityId ? (
                  <Link to={`/book/${encodeURIComponent(entry.entityId)}`} className="hover:bg-accent block transition-colors">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
