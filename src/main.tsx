import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initThemeWatcher } from './lib/utils'
import './index.css'
import { App } from './App'

initThemeWatcher()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
