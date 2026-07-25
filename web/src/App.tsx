import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, type ReactNode } from 'react'
import { AuthBar } from '@/auth/AuthBar'
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher'
import { SubHeaderContext } from '@/components/subheader'
import { useHideOnScroll } from '@/hooks/useHideOnScroll'
import { cn } from '@/lib/utils'
import { CatalogPage } from '@/pages/CatalogPage'
import { BookDetailPage } from '@/pages/BookDetailPage'
import { BookFormPage } from '@/pages/BookFormPage'
import { ArchivedPage } from '@/pages/ArchivedPage'
import { AboutPage } from '@/pages/AboutPage'

/**
 * App shell: a sticky, full-width header (brand · language · sign-in) over the
 * routed page, plus a slot below the brand row that pages fill (via a portal) so
 * their toolbar — e.g. the catalog filter bar — anchors together with the brand.
 */
function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [slot, setSlot] = useState<HTMLDivElement | null>(null)
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
              stays the link home to the catalog, so a home affordance remains. */}
          <div className="flex min-w-0 shrink items-center gap-2.5">
            <Link to="/about" aria-label={t('nav.about')} className="shrink-0">
              <img src="/georgie.gif" alt="" className="w-8 sm:w-10" />
            </Link>
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
            <AuthBar />
          </div>
        </div>
        {/* Pages portal their sticky toolbar here (see useSubHeaderContainer). */}
        <div ref={setSlot} />
      </header>

      <SubHeaderContext value={slot}>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </SubHeaderContext>
    </div>
  )
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        {/* `new` before `:id` so it isn't swallowed by the detail route. */}
        <Route path="/book/new" element={<BookFormPage mode="add" />} />
        <Route path="/book/:id/edit" element={<BookFormPage mode="edit" />} />
        <Route path="/book/:id" element={<BookDetailPage />} />
        <Route path="/archived" element={<ArchivedPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
