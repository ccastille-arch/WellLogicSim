import { WellLogicCompact } from '../WellLogicBrand'
import { useState } from 'react'
import AnimatedClips from './AnimatedClips'
import SalesSheets from './SalesSheets'
import SlideDeck from './SlideDeck'

const TABS = [
  { id: 'clips', label: 'Product Videos', icon: '🎬', desc: 'Animated explainer clips' },
  { id: 'sheets', label: 'Sales Sheets', icon: '📄', desc: 'One-pagers & leave-behinds' },
  { id: 'slides', label: 'Slide Deck', icon: '📊', desc: 'Full presentation walkthrough' },
  { id: 'downloads', label: 'Downloads', icon: '↓', desc: 'Docs, drawings & datasheets' },
]

const DOWNLOADS = [
  { file: 'Wellhead_Customer_Comms_AWI.xlsx', label: 'Wellhead Customer Comms (AWI)', type: 'XLSX', icon: '📊' },
  { file: 'Wellhead_SCADA_AWI_Registers.xlsx', label: 'SCADA AWI Register Map', type: 'XLSX', icon: '📊' },
  { file: 'Drawings_Electrical_450hp.pdf', label: 'Electrical Drawings — 450HP Panel', type: 'PDF', icon: '📐' },
]

export default function MarketingHub({ onClose }) {
  const [activeTab, setActiveTab] = useState('clips')

  return (
    <div className="fixed inset-0 z-50 bg-[#05233E] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#0F3C64] border-b border-[#293C5B] shrink-0">
        <div className="flex items-center gap-4">
          <WellLogicCompact size={34} />
          <span className="text-sm text-white" style={{ fontFamily: "'Montserrat'" }}>Marketing Materials</span>
        </div>
        <button onClick={onClose} className="px-4 py-1.5 text-[11px] font-bold text-[#888] border border-[#333] rounded hover:text-white hover:border-[#D32028]">
          ← Back to Setup
        </button>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2 px-6 py-3 bg-[#03172A] border-b border-[#293C5B] shrink-0">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold transition-all ${
              activeTab === tab.id ? 'bg-[#D32028] text-white' : 'bg-[#111120] text-[#888] hover:text-white hover:bg-[#293C5B] border border-[#2a2a3a]'
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
        {activeTab === 'downloads' && (
          <div className="p-6 max-w-[800px] mx-auto">
            <h2 className="text-lg text-white font-bold mb-1" style={{ fontFamily: "'Montserrat'" }}>Downloads</h2>
            <p className="text-[12px] text-[#888] mb-6">Technical documents, drawings, and datasheets — click to download directly.</p>
            <div className="space-y-3">
              {DOWNLOADS.map(d => (
                <a key={d.file} href={`/docs/${d.file}`} download
                  className="flex items-center gap-4 bg-[#0F3C64] border border-[#222] hover:border-[#D32028]/50 rounded-xl px-5 py-4 transition-colors group">
                  <span className="text-3xl">{d.icon}</span>
                  <div className="flex-1">
                    <div className="text-[13px] text-white font-bold group-hover:text-[#D32028] transition-colors">{d.label}</div>
                    <div className="text-[10px] text-[#555] mt-0.5">{d.file}</div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-1 rounded border border-[#333] text-[#888]">{d.type}</span>
                  <span className="text-[11px] font-bold text-[#D32028] group-hover:text-white transition-colors">↓ Download</span>
                </a>
              ))}
            </div>
            <p className="text-[10px] text-[#555] mt-6 text-center">Sales sheets can be printed from the Sales Sheets tab — open any sheet and click Download / Print.</p>
          </div>
        )}
      </div>
    </div>
  )
}
