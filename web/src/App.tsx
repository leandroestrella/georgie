import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { lazy, Suspense, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AuthBar } from '@/auth/AuthBar'
import { useAuth } from '@/auth/AuthProvider'
import { useCatalog } from '@/catalog/CatalogProvider'
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher'
import { AdminSlotContext, SubHeaderContext } from '@/components/subheader'
import { useBusy } from '@/components/BusyProvider'
import { useHideOnScroll } from '@/hooks/useHideOnScroll'
import { cn } from '@/lib/utils'
import { LoadingAvatar } from '@/components/LoadingAvatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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
 * App shell: a sticky, full-width header over the routed page — a main row
 * (brand · language · nav icons) and, directly below it, a sign-in row (a
 * page's write-gated admin action, e.g. "add book" · sign-in/avatar/sign-out)
 * — plus a slot pages fill via a portal for the rest of a page's toolbar,
 * e.g. the catalog filter bar, anchoring it to the header.
 */
function Layout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation()
  const privacyHref = `https://leandroestrella.com/${i18n.resolvedLanguage === 'it' ? 'privacy-it' : 'privacy'}.html#georgie`
  const { status, isAdmin } = useAuth()
  const { loading } = useCatalog()
  const { busy } = useBusy()
  const location = useLocation()
  const [slot, setSlot] = useState<HTMLDivElement | null>(null)
  const [adminSlot, setAdminSlot] = useState<HTMLDivElement | null>(null)
  const [avatarHovered, setAvatarHovered] = useState(false)
  // On a phone the header is a big share of the viewport; slide it away while
  // scrolling down through the catalog and bring it back on the way up.
  const hidden = useHideOnScroll()
  // The hover lightbox is a fun extra, not something to show over a loading
  // state or a page that's currently asking the visitor to sign in (only
  // Overview does this today) — it would pop up a big mascot right as the
  // page underneath is still resolving or asking for attention.
  const overviewNeedsSignIn = location.pathname === '/overview' && status !== 'loading' && !isAdmin
  const avatarHoverDisabled = loading || busy || overviewNeedsSignIn

  return (
    <div className="flex min-h-svh flex-col">
      <header
        className={cn(
          'bg-background/90 sticky top-0 z-30 border-b backdrop-blur transition-transform duration-200',
          hidden && '-translate-y-full',
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* The wordmark is the only brand mark up here now — it's the link
              home to the catalog. The animated mascot lives in the footer
              (its /about link + hover lightbox moved there with it). */}
          <div className="flex min-w-0 shrink items-center gap-2.5">
            <Link to="/" className="min-w-0">
              <h1 className="truncate text-lg leading-none font-semibold lowercase tracking-tight sm:text-xl">
                georgie
              </h1>
              {/* The tagline is charming but costs a line on a phone. */}
              <p className="text-muted-foreground hidden text-xs lowercase sm:block">
                {t('app.tagline')}
              </p>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Matches linkulino's own Overview nav glyph exactly (a
                    literal emoji, not an icon-library icon) — the shared
                    visual language across this author's house-management
                    app ecosystem. */}
                <Link
                  to="/overview"
                  aria-label={t('nav.overview')}
                  className="hover:bg-accent rounded-md p-2 text-lg leading-none"
                >
                  📊
                </Link>
              </TooltipTrigger>
              <TooltipContent>{t('nav.overview')}</TooltipContent>
            </Tooltip>
            {/* Admin-only — unlike Overview (public-facing, self-gates with a
                sign-in prompt), the audit log has nothing to show a signed-out
                visitor, so the link itself is hidden rather than dead-ending.
                🕘 matches linkulino's own History nav glyph exactly (a literal
                emoji, same as Overview's 📊 above). */}
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/history"
                    aria-label={t('nav.history')}
                    className="hover:bg-accent rounded-md p-2 text-lg leading-none"
                  >
                    🕘
                  </Link>
                </TooltipTrigger>
                <TooltipContent>{t('nav.history')}</TooltipContent>
              </Tooltip>
            )}
            {/* privacy notice for this site, in the visitor's language */}
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={privacyHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t('nav.privacy')}
                  className="hover:bg-accent rounded-md p-2 text-lg leading-none"
                >
                  🛡️
                </a>
              </TooltipTrigger>
              <TooltipContent>{t('nav.privacy')}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        {/* Row 2: a page's write-gated admin action (left, e.g. "add book") +
            sign-in/avatar/sign-out (right) — always its own row below the main
            button bar, matching linkulino's own two-row header exactly (see
            linkulino's App.tsx Layout) rather than crowding onto the brand row. */}
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 pb-3 sm:px-6">
          <div ref={setAdminSlot} className="flex items-center gap-2" />
          <AuthBar />
        </div>
        {/* Pages portal their sticky toolbar here (see useSubHeaderContainer). */}
        <div ref={setSlot} />
      </header>

      <AdminSlotContext value={adminSlot}>
        <SubHeaderContext value={slot}>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
        </SubHeaderContext>
      </AdminSlotContext>

      {/* Footer: the author's portfolio (left), the animated mascot (center —
          moved down from the header's top-left corner), this project's source
          (right). A 3-column grid, not flex justify-between, so the mascot
          sits at the true horizontal center regardless of how the two side
          links' widths compare. Sticky to the viewport bottom, mirroring the
          sticky header — same max-width and horizontal padding, so they line
          up under the header. It slides down out of the way while scrolling
          down and returns on scroll-up, driven by the same useHideOnScroll
          signal as the header. */}
      <footer
        className={cn(
          'bg-background/90 sticky bottom-0 z-30 border-t backdrop-blur transition-transform duration-200',
          hidden && 'translate-y-full',
        )}
      >
        <div className="mx-auto grid w-full max-w-6xl grid-cols-3 items-center px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3 justify-self-start">
            <a
              href="https://www.leandroestrella.com/"
              target="_blank"
              rel="noreferrer"
              aria-label={t('nav.portfolio')}
              title={t('nav.portfolio')}
              className="opacity-70 transition-opacity hover:opacity-100"
            >
              <img
                src="https://www.leandroestrella.com/img/favicon.ico"
                alt=""
                className="size-6 rounded-sm"
              />
            </a>
          </div>
          {/* The mascot's own /about link + hover lightbox (frameless — just
              the gif), suppressed via `avatarHoverDisabled` while something
              more important is on screen: the catalog's still loading, an
              admin write is in flight (LoadingOverlay), or the current page
              is asking the visitor to sign in. */}
          <div className="relative justify-self-center">
            <Link
              to="/about"
              aria-label={t('nav.about')}
              onMouseEnter={() => !avatarHoverDisabled && setAvatarHovered(true)}
              onMouseLeave={() => setAvatarHovered(false)}
            >
              <img src="/georgie.gif" alt="" className="w-8 sm:w-10" />
            </Link>
            {avatarHovered && !avatarHoverDisabled &&
              createPortal(
                <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
                  <img src="/georgie.gif" alt="" className="w-64 max-w-[80vw] sm:w-80" />
                </div>,
                document.body,
              )}
          </div>
          <a
            href="https://github.com/leandroestrella/georgie"
            target="_blank"
            rel="noreferrer"
            aria-label={t('nav.repo')}
            title={t('nav.repo')}
            className="text-muted-foreground hover:text-foreground justify-self-end opacity-80 transition hover:opacity-100"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className="size-6 fill-current">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
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
