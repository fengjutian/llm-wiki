import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { hydrateTheme } from './stores/themeStore'
import './index.css'

// Apply the persisted/initial theme to <html> before React mounts to prevent a flash.
hydrateTheme()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
