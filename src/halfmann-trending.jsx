import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import HalfmannTrending from './components/HalfmannTrending'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HalfmannTrending />
  </StrictMode>,
)
