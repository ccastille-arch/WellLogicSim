import { useAuth } from '../AuthProvider'

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

      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <h3 className="text-[12px] font-bold text-white mb-2">Branding</h3>
        <p className="text-[11px] text-[#888]">
          The simulator now uses the Pad Logic brand mark everywhere. Logo voting and alternate logo selection have been removed.
        </p>
      </div>
    </div>
  )
}
