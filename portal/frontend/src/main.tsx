import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { OxygenUIThemeProvider, AcrylicOrangeTheme, CssBaseline } from '@wso2/oxygen-ui'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OxygenUIThemeProvider theme={AcrylicOrangeTheme}>
      <CssBaseline />
      <App />
    </OxygenUIThemeProvider>
  </StrictMode>,
)
