import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PublicLiveView from './components/PublicLiveView'
import HalfmannLiveView from './components/HalfmannLiveView'

const isHalfmann = window.location.pathname.includes('halfmann')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isHalfmann ? <HalfmannLiveView /> : <PublicLiveView />}
  </StrictMode>,
)
