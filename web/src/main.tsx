import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { CatalogProvider } from './catalog/CatalogProvider.tsx'
import { BusyProvider } from './components/BusyProvider.tsx'
import { LoadingOverlay } from './components/LoadingOverlay.tsx'
import { TooltipProvider } from './components/ui/tooltip.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CatalogProvider>
          <TooltipProvider delayDuration={200}>
            <BusyProvider>
              <App />
              <LoadingOverlay />
            </BusyProvider>
          </TooltipProvider>
        </CatalogProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
