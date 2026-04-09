import { useState } from 'react'
import AnimatedClips from './AnimatedClips'
import SalesSheets from './SalesSheets'
import SlideDeck from './SlideDeck'

const TABS = [
  { id: 'clips', label: 'Product Videos', icon: '🎬', desc: 'Animated explainer clips' },
  { id: 'sheets', label: 'Sales Sheets', icon: '📄', desc: 'One-pagers & leave-behinds' },
  { id: 'slides', label: 'Slide Deck', icon: '📊', desc: 'Full presentation walkthrough' },
]

export default function MarketingHub({ onClose }) {
  const [activeTab, setActiveTab] = useState('clips')

  return (
    <div className="fixed inset-0 z-50 bg-[#080810] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#0c0c16] border-b border-[#1a1a2a] shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-xl tracking-tight" style={{ fontFamily: "'Arial Black'", fontStyle: 'italic', color: '#E8200C' }}>FieldTune™</span>
          <div className="w-px h-6 bg-[#333]" />
          <span className="text-sm text-white" style={{ fontFamily: "'Arial Black'" }}>Marketing Materials</span>
        </div>
        <button onClick={onClose} className="px-4 py-1.5 text-[11px] font-bold text-[#888] border border-[#333] rounded hover:text-white hover:border-[#E8200C]">
          ← Back to Setup
        </button>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2 px-6 py-3 bg-[#0a0a14] border-b border-[#1a1a2a] shrink-0">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold transition-all ${
              activeTab === tab.id ? 'bg-[#E8200C] text-white' : 'bg-[#111120] text-[#888] hover:text-white hover:bg-[#1a1a2a] border border-[#2a2a3a]'
            }`}>
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'clips' && <AnimatedClips />}
        {activeTab === 'sheets' && <SalesSheets />}
        {activeTab === 'slides' && <SlideDeck />}
      </div>
    </div>
  )
}
