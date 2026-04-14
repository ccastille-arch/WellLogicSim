import { useAuth } from '../AuthProvider'
import { LOGO_OPTIONS, getSelectedLogo } from '../../BrandLogos'

export default function SettingsTab() {
  const { settings, updateSettings } = useAuth()

  return (
    <div className="space-y-5">
      {/* General settings */}
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <h3 className="text-[12px] font-bold text-white mb-3">General</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!settings.forumPublic}
            onChange={e => updateSettings('forumPublic', e.target.checked)}
            className="accent-[#E8200C]" />
          <span className="text-[11px] text-white">Forum visible to all users</span>
        </label>
      </div>

      {/* Branding */}
      {typeof LOGO_OPTIONS !== 'undefined' && LOGO_OPTIONS?.length > 0 && (
        <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
          <h3 className="text-[12px] font-bold text-white mb-3">Branding</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {LOGO_OPTIONS.map(logo => {
              const isSelected = settings.selectedLogo === logo.id
              return (
                <button key={logo.id}
                  onClick={() => updateSettings('selectedLogo', logo.id)}
                  className={`rounded-xl border-2 p-3 flex flex-col items-center transition-all ${
                    isSelected ? 'border-[#E8200C] bg-[#E8200C]/10' : 'border-[#1e1e30] hover:border-[#333]'
                  }`}>
                  <div className="h-12 flex items-center justify-center mb-2">
                    {logo.Full && <logo.Full size={48} />}
                  </div>
                  <span className="text-[9px] text-[#888]">{logo.name}</span>
                </button>
              )
            })}
            <button onClick={() => updateSettings('selectedLogo', null)}
              className={`rounded-xl border-2 p-3 flex flex-col items-center transition-all ${
                !settings.selectedLogo ? 'border-[#E8200C] bg-[#E8200C]/10' : 'border-[#1e1e30] hover:border-[#333]'
              }`}>
              <div className="h-12 flex items-center justify-center mb-2">
                <span className="text-[20px] text-[#555]">Aa</span>
              </div>
              <span className="text-[9px] text-[#888]">Text Only</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
