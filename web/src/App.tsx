import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { lazy, Suspense, type ReactNode } from 'react'
import { AuthBar, useAuth as useSession } from '@lndrstrll/pomuku-auth'
import { AppShell, FooterMascot, LanguageSwitcher, LoadingAvatar, Mascot, NavGlyph } from '@lndrstrll/pomuku-ui'
import { useAuth } from '@/auth/AuthProvider'
import { useCatalog } from '@/catalog/CatalogProvider'

// Route-level code splitting: each page is its own chunk, fetched on first
// visit rather than upfront. AboutPage alone pulls in react-markdown +
// remark-gfm + rehype-raw, and BookFormPage pulls in the barcode scanner —
// neither is needed by a visitor who only ever browses the catalog.
const CatalogPage = lazy(() => import('@/pages/CatalogPage').then((m) => ({ default: m.CatalogPage })))
const BookDetailPage = lazy(() => import('@/pages/BookDetailPage').then((m) => ({ default: m.BookDetailPage })))
const BookFormPage = lazy(() => import('@/pages/BookFormPage').then((m) => ({ default: m.BookFormPage })))
const ArchivedPage = lazy(() => import('@/pages/ArchivedPage').then((m) => ({ default: m.ArchivedPage })))
const AboutPage = lazy(() => import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const OverviewPage = lazy(() => import('@/pages/OverviewPage').then((m) => ({ default: m.OverviewPage })))
const HistoryPage = lazy(() => import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })))

/**
 * The page every route is laid out on: pomuku's shell — a sticky header (the
 * wordmark and the nav glyphs, then a row with the page's main action and the
 * sign-in control, then the page's own toolbar, e.g. the catalog's filter bar)
 * over the routed page, and a sticky footer. Both slide away while scrolling
 * down. This file only says what goes in each place.
 */
function Layout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation()
  const privacyHref = `https://leandroestrella.com/${i18n.resolvedLanguage === 'it' ? 'privacy-it' : 'privacy'}.html#georgie`
  const { status, isAdmin } = useAuth()
  const { setLanguage } = useSession()
  const { loading } = useCatalog()
  const location = useLocation()
  // The mascot's hover lightbox is a fun extra, not something to show over a
  // page that's still loading or one that's asking the visitor to sign in
  // (only Overview does this today).
  const overviewNeedsSignIn = location.pathname === '/overview' && status !== 'loading' && !isAdmin

  return (
    <AppShell
      brand={
        // The wordmark is the only brand mark up here — it's the link home to
        // the catalog. The animated mascot lives in the footer.
        <Link to="/" className="min-w-0">
          <h1 className="truncate text-lg leading-none font-semibold tracking-tight sm:text-xl">georgie</h1>
          {/* The tagline is charming but costs a line on a phone. */}
          <p className="text-muted-foreground hidden text-xs sm:block">{t('app.tagline')}</p>
        </Link>
      }
      nav={
        <>
          {/* A signed-in person's choice is saved on their account too, so the
              app opens in it on their next device. */}
          <LanguageSwitcher onChange={(language) => void setLanguage(language).catch(() => undefined)} />
          {/* Literal emoji rather than icon-library icons: the shared visual
              language across this author's house-management apps. */}
          <NavGlyph label={t('nav.overview')}>
            <Link to="/overview">📊</Link>
          </NavGlyph>
          {/* Signed-in only — unlike Overview (which gates itself with a
              sign-in prompt), the history log has nothing to show a visitor,
              so the link itself is hidden rather than dead-ending. */}
          {isAdmin && (
            <NavGlyph label={t('nav.history')}>
              <Link to="/history">🕘</Link>
            </NavGlyph>
          )}
          {/* privacy notice for this site, in the visitor's language */}
          <NavGlyph label={t('nav.privacy')}>
            <a href={privacyHref} target="_blank" rel="noreferrer">
              🛡️
            </a>
          </NavGlyph>
        </>
      }
      account={<AuthBar />}
      footer={{
        left: (
          <a
            href="https://www.leandroestrella.com/"
            target="_blank"
            rel="noreferrer"
            aria-label={t('nav.portfolio')}
            title={t('nav.portfolio')}
            className="opacity-70 transition-opacity hover:opacity-100"
          >
            <img src="https://www.leandroestrella.com/img/favicon.ico" alt="" className="size-6 rounded-sm" />
          </a>
        ),
        center: (
          <FooterMascot label={t('nav.about')} quiet={loading || overviewNeedsSignIn}>
            <Link to="/about">
              <Mascot footer className="w-8 sm:w-10" />
            </Link>
          </FooterMascot>
        ),
        right: (
          <a
            href="https://github.com/leandroestrella/georgie"
            target="_blank"
            rel="noreferrer"
            aria-label={t('nav.repo')}
            title={t('nav.repo')}
            className="text-muted-foreground hover:text-foreground opacity-80 transition hover:opacity-100"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-6 fill-current">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </a>
        ),
      }}
    >
      {children}
    </AppShell>
  )
}

function App() {
  return (
    <Layout>
      <Suspense fallback={<LoadingAvatar />}>
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          {/* `new` before `:id` so it isn't swallowed by the detail route. */}
          <Route path="/book/new" element={<BookFormPage mode="add" />} />
          <Route path="/book/:id/edit" element={<BookFormPage mode="edit" />} />
          <Route path="/book/:id" element={<BookDetailPage />} />
          <Route path="/archived" element={<ArchivedPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App
