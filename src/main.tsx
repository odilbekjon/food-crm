import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from '@/app/router'
import { restoreSession, signedOut } from '@/app/slices/session'
import { store } from '@/app/store'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from '@/hooks/use-theme'
import { isRemote } from '@/services/config'
import { onUnauthorized } from '@/services/http'
import { I18nProvider } from '@/i18n/I18nProvider'

if (isRemote) {
  // Sessiya tugasa (401) foydalanuvchi login sahifasiga qaytariladi; kirmagan holatda (login xatosi) hech narsa qilinmaydi.
  onUnauthorized(() => {
    if (store.getState().session.user) store.dispatch(signedOut())
  })
  void store.dispatch(restoreSession())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <I18nProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
            <Toaster position="top-right" richColors closeButton />
          </TooltipProvider>
        </I18nProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
)
