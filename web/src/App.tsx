import { useEffect, useState } from 'react'
import { getBooks, getTaxonomies } from '@/api/client'
import { hasBackend } from '@/config'
import type { Book, Taxonomies } from '@/api/types'

/**
 * Root application shell.
 *
 * Phase 1 wires the shell to the data layer: it loads the catalog + taxonomy
 * through the API client (mock data until a backend is configured) and shows a
 * minimal summary, proving the whole read path works in the browser. The real
 * catalog UI (search, filters, detail) arrives in Phase 3.
 */
function App() {
  const [books, setBooks] = useState<Book[] | null>(null)
  const [taxonomies, setTaxonomies] = useState<Taxonomies | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getBooks(), getTaxonomies()])
      .then(([b, t]) => {
        setBooks(b)
        setTaxonomies(t)
      })
      .catch((e) => setError(String(e)))
  }, [])

  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col gap-8 p-8">
      <header className="flex items-center gap-4">
        <img src="/georgie.gif" alt="georgie" className="w-16" />
        <div>
          <h1 className="text-3xl font-semibold lowercase tracking-tight">georgie</h1>
          <p className="text-muted-foreground text-sm lowercase">
            a cozy little home for your home library.
          </p>
        </div>
      </header>

      <section className="rounded-lg border p-4">
        <p className="text-muted-foreground mb-3 text-xs uppercase tracking-wide">
          data layer · {hasBackend ? 'live backend' : 'mock data'}
        </p>

        {error && <p className="text-destructive text-sm">{error}</p>}
        {!error && !books && <p className="text-muted-foreground text-sm">loading…</p>}

        {books && taxonomies && (
          <>
            <p className="text-sm">
              <strong>{books.length}</strong> books ·{' '}
              <strong>{taxonomies.zones.length}</strong> zones ·{' '}
              <strong>{taxonomies.owners.length}</strong> owners ·{' '}
              <strong>{taxonomies.languages.length}</strong> languages
            </p>
            <ul className="mt-4 space-y-1 text-sm">
              {books.slice(0, 8).map((b) => (
                <li key={b.id} className="flex justify-between gap-4">
                  <span className="truncate">
                    <span className="text-muted-foreground font-mono text-xs">{b.id}</span>{' '}
                    {b.title}
                  </span>
                  <span className="text-muted-foreground shrink-0">
                    {b.zone || '—'}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}

export default App
