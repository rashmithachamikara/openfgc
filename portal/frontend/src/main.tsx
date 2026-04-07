import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { OxygenUIThemeProvider, AcrylicOrangeTheme, CssBaseline } from '@wso2/oxygen-ui'
import App from './App.tsx'
import i18n from './i18n/i18n'
import queryClient from './utils/queryClient'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OxygenUIThemeProvider theme={AcrylicOrangeTheme}>
      <CssBaseline />
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </I18nextProvider>
    </OxygenUIThemeProvider>
  </StrictMode>,
)
