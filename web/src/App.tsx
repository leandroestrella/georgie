import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { AuthBar } from '@/auth/AuthBar'
import { LanguageSwitcher } from '@/i18n/LanguageSwitcher'
import { CatalogPage } from '@/pages/CatalogPage'
import { BookDetailPage } from '@/pages/BookDetailPage'

/** App shell: sticky header (brand · language · sign-in) around the routed page. */
function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex min-h-svh max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3">
          <img src="/georgie.gif" alt="" className="w-11" />
          <div>
            <h1 className="text-2xl leading-none font-semibold lowercase tracking-tight">georgie</h1>
            <p className="text-muted-foreground text-xs lowercase">{t('app.tagline')}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <AuthBar />
        </div>
      </header>

      <main className="flex-1">{children}</main>
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
