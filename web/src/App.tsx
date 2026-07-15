import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { AuthBar } from '@/auth/AuthBar'
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher'
import { CatalogPage } from '@/pages/CatalogPage'
import { BookDetailPage } from '@/pages/BookDetailPage'

/** App shell: a sticky, full-width header (brand · language · sign-in) over the routed page. */
function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-background/90 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <img src="/georgie.gif" alt="" className="w-10" />
            <div>
              <h1 className="text-xl leading-none font-semibold lowercase tracking-tight">georgie</h1>
              <p className="text-muted-foreground text-xs lowercase">{t('app.tagline')}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <AuthBar />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  )
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/book/:id" element={<BookDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
