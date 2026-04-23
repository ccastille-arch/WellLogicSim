import { useState } from 'react'
import { useAuth } from '../AuthProvider'
import { LOGOS } from '../../../constants/logos'

export default function LogoTab() {
  const { settings, updateSettings } = useAuth()
  const activeId = settings.activeLogoId || null
  const [preview, setPreview] = useState(activeId || LOGOS[0].id)

  const previewLogo = LOGOS.find(l => l.id === preview) || LOGOS[0]
  const activeLogo = LOGOS.find(l => l.id === activeId)

  const setActive = (id) => {
    updateSettings('activeLogoId', id)
  }

  const resetToDefault = () => {
    updateSettings('activeLogoId', null)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <h3 className="text-[12px] font-bold text-white mb-1">Logo Gallery</h3>
        <p className="text-[11px] text-[#888]">
          Select a logo to preview it. Click "Set Active" to make it the simulator's active logo for all users.
          {activeLogo && (
            <span className="ml-2 text-[#22c55e] font-bold">Current: {activeLogo.label}</span>
          )}
          {!activeLogo && (
            <span className="ml-2 text-[#eab308]">Using default Pad Logic brand</span>
          )}
        </p>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-6">
        <div className="text-[10px] text-[#555] uppercase tracking-wider mb-3">Preview — {previewLogo.label}</div>
        <div className="flex items-center justify-center bg-[#050508] rounded-xl p-6 mb-4 min-h-[100px]">
          {previewLogo.full(64)}
        </div>
        <div className="flex items-center gap-2 bg-[#0a0a14] rounded-lg px-4 py-3 mb-4">
          <span className="text-[10px] text-[#555]">Header compact:</span>
          <div className="flex items-center">
            {previewLogo.compact(32)}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActive(preview)}
            disabled={activeId === preview}
            className="px-4 py-2 text-[11px] font-bold bg-[#E8200C] text-white rounded-lg hover:bg-[#c01a0a] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {activeId === preview ? '✓ Active Logo' : 'Set Active Logo'}
          </button>
          {activeId && (
            <button
              onClick={resetToDefault}
              className="px-4 py-2 text-[11px] text-[#888] border border-[#333] rounded-lg hover:text-white hover:border-[#555]"
            >
              Reset to Default
            </button>
          )}
        </div>
      </div>

      {/* Logo grid */}
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <div className="grid grid-cols-4 gap-2">
          {LOGOS.map((logo) => {
            const isActive = logo.id === activeId
            const isPreviewing = logo.id === preview

            return (
              <button
                key={logo.id}
                onClick={() => setPreview(logo.id)}
                className={`relative p-3 rounded-lg border transition-all text-left ${
                  isActive
                    ? 'border-[#22c55e] bg-[#0d1a0d]'
                    : isPreviewing
                    ? 'border-[#E8200C] bg-[#1a0a0a]'
                    : 'border-[#1a1a2a] bg-[#090913] hover:border-[#333]'
                }`}
              >
                <div className="flex items-center justify-center h-10 mb-1 overflow-hidden">
                  {logo.compact(24)}
                </div>
                <div className="text-[8px] text-[#666] truncate text-center">{logo.label}</div>
                {isActive && (
                  <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#22c55e]" />
                )}
              </button>
            )
          })}
        </div>
        <div className="mt-3 text-[10px] text-[#555] text-center">
          {LOGOS.length} logo concepts · Click to preview · Green dot = currently active
        </div>
      </div>
    </div>
  )
}
