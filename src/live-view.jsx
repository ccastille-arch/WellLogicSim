import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PublicLiveView from './components/PublicLiveView'
import HalfmannLiveView from './components/HalfmannLiveView'
import SupremeLiveView from './components/SupremeLiveView'

const isHalfmann = window.location.pathname.includes('halfmann')
const isSupreme = window.location.pathname.includes('supreme')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isSupreme ? <SupremeLiveView /> : isHalfmann ? <HalfmannLiveView /> : <PublicLiveView />}
  </StrictMode>,
)
