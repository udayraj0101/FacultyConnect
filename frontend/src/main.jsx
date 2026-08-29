import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { createLogger } from './utils/logger'

const logger = createLogger('frontend.bootstrap')

window.addEventListener('error', event => {
  logger.error('window.error', {
    message: event.message,
    source: event.filename,
    line: event.lineno,
    column: event.colno,
  })
})

window.addEventListener('unhandledrejection', event => {
  logger.error('window.unhandledrejection', { reason: String(event.reason) })
})

logger.info('app.mount.start')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
