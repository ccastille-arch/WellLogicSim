import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PublicLiveView from './components/PublicLiveView'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PublicLiveView />
  </StrictMode>,
)
