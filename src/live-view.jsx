import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PublicLiveView from './components/PublicLiveView'
import HalfmannLiveView from './components/HalfmannLiveView'
import HalfmannTrending from './components/HalfmannTrending'

const isHalfmann = window.location.pathname.includes('halfmann')
const isTrending = new URLSearchParams(window.location.search).get('tab') === 'trending'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isHalfmann && isTrending ? <HalfmannTrending /> : isHalfmann ? <HalfmannLiveView /> : <PublicLiveView />}
  </StrictMode>,
)
