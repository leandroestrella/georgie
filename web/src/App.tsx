import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { lazy, Suspense, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AuthBar } from '@/auth/AuthBar'
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher'
import { AdminSlotContext, SubHeaderContext } from '@/components/subheader'
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

/**
 * App shell: a sticky, full-width header (brand · language · sign-in) over the
 * routed page, plus two slots pages fill via a portal — one on the brand row,
 * next to sign-in, for a page's write-gated admin action (e.g. "add book"), so
 * it always sits beside the login control; one below that for the rest of a
 * page's toolbar — e.g. the catalog filter bar — anchoring it to the header.
 */
function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [slot, setSlot] = useState<HTMLDivElement | null>(null)
  const [adminSlot, setAdminSlot] = useState<HTMLDivElement | null>(null)
  const [avatarHovered, setAvatarHovered] = useState(false)
  // On a phone the header is a big share of the viewport; slide it away while
  // scrolling down through the catalog and bring it back on the way up.
  const hidden = useHideOnScroll()

  return (
    <div className="flex min-h-svh flex-col">
      <header
        className={cn(
          'bg-background/90 sticky top-0 z-30 border-b backdrop-blur transition-transform duration-200',
          hidden && '-translate-y-full',
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          {/* The avatar opens the About page (the rendered README); the wordmark
              stays the link home to the catalog, so a home affordance remains.
              Hovering it also pops the mascot up full-size in a centered
              lightbox, which closes the moment the pointer leaves. */}
          <div className="flex min-w-0 shrink items-center gap-2.5">
            <Link
              to="/about"
              aria-label={t('nav.about')}
              className="shrink-0"
              onMouseEnter={() => setAvatarHovered(true)}
              onMouseLeave={() => setAvatarHovered(false)}
            >
              <img src="/georgie.gif" alt="" className="w-8 sm:w-10" />
            </Link>
            {avatarHovered &&
              createPortal(
                <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
                  <div className="rounded-2xl bg-black p-4 shadow-2xl">
                    <img src="/georgie.gif" alt="" className="w-64 max-w-[80vw] sm:w-80" />
                  </div>
                </div>,
                document.body,
              )}
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
            {/* A page portals its write-gated primary action here (see
                useAdminSlotContainer), so it always sits beside sign-in. */}
            <div ref={setAdminSlot} className="flex items-center gap-2" />
            <AuthBar />
          </div>
        </div>
        {/* Pages portal their sticky toolbar here (see useSubHeaderContainer). */}
        <div ref={setSlot} />
      </header>

      <AdminSlotContext value={adminSlot}>
        <SubHeaderContext value={slot}>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
        </SubHeaderContext>
      </AdminSlotContext>

      {/* Footer: the author's portfolio (left) and this project's source (right).
          Sticky to the viewport bottom, mirroring the sticky header — same
          max-width and horizontal padding, so they line up under the header. It
          slides down out of the way while scrolling down and returns on scroll-up,
          driven by the same useHideOnScroll signal as the header. */}
      <footer
        className={cn(
          'bg-background/90 sticky bottom-0 z-30 border-t backdrop-blur transition-transform duration-200',
          hidden && 'translate-y-full',
        )}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App
