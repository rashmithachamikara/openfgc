import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import { OxygenUIThemeProvider, AcrylicOrangeTheme, CssBaseline } from '@wso2/oxygen-ui'
import App from './App.tsx'
import i18n from './i18n/i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OxygenUIThemeProvider theme={AcrylicOrangeTheme}>
      <CssBaseline />
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    </OxygenUIThemeProvider>
  </StrictMode>,
)
