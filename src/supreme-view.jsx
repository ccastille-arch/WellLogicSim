import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SupremeLiveView from './components/SupremeLiveView'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SupremeLiveView />
  </StrictMode>,
)
