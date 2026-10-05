import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { BrowserRouter } from 'react-router-dom'
import { BusyProvider, LoadingOverlay, MascotProvider } from '@lndrstrll/pomuku-ui'
import './index.css'
import { i18n } from './i18n'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { client } from './backend.ts'
import { CatalogProvider } from './catalog/CatalogProvider.tsx'

// Someone opened the app: the backend takes a look at the spreadsheet, if its
// last look is a few minutes old, so edits made there show up without anyone
// asking. Once per page load; never fails.
client.visit()

// Georgie in every size the shared components draw a mascot at: still on the
// sign-in wall, animated in the footer and in the loading bubble.
const MASCOT = { still: '/georgie.png', footer: '/georgie.gif', large: '/georgie.gif' }

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <BrowserRouter>
        <MascotProvider images={MASCOT}>
          <BusyProvider>
            <AuthProvider>
              <CatalogProvider>
                <App />
                <LoadingOverlay />
              </CatalogProvider>
            </AuthProvider>
          </BusyProvider>
        </MascotProvider>
      </BrowserRouter>
    </I18nextProvider>
  </StrictMode>,
)
