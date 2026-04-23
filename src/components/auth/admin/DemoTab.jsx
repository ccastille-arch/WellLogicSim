import { useState, useRef } from 'react'
import { useAuth } from '../AuthProvider'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Step titles mirrored from AutoPilot SCRIPT (kept in sync manually)
const SCRIPT_STEPS = [
  { title: 'Welcome', defaultDuration: 8000 },
  { title: 'Normal Operations', defaultDuration: 7000 },
  { title: 'Compressor Trips', defaultDuration: 3000 },
  { title: 'Impact', defaultDuration: 6000 },
  { title: 'Without Pad Logic', defaultDuration: 12000 },
  { title: 'Pad Logic Responds', defaultDuration: 10000 },
  { title: 'Priority Wells Protected', defaultDuration: 10000 },
  { title: 'Restoring', defaultDuration: 5000 },
  { title: 'Gas Supply Drops', defaultDuration: 4000 },
  { title: 'Priority Enforcement', defaultDuration: 12000 },
  { title: 'Restoring', defaultDuration: 4000 },
  { title: 'Well Unload Event', defaultDuration: 5000 },
  { title: 'Pad Logic Handles It', defaultDuration: 10000 },
  { title: 'The Bottom Line', defaultDuration: 12000 },
  { title: 'ROI', defaultDuration: 8000 },
  { title: 'Questions', defaultDuration: 0 },
]

export default function DemoTab() {
  const { settings, updateSettings, user } = useAuth()
  const timings = settings.demoPresentationTimings || {}
  const serverVoiceover = settings.presentationVoiceover
  const scriptDefault = settings.demoPresentationScriptDefault ?? true

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const fileInputRef = useRef(null)

  const updateTiming = (index, ms) => {
    updateSettings('demoPresentationTimings', { ...timings, [index]: Math.max(0, ms) })
  }

  const resetTiming = (index) => {
    const next = { ...timings }
    delete next[index]
    updateSettings('demoPresentationTimings', next)
  }

  const resetAllTimings = () => {
    updateSettings('demoPresentationTimings', {})
  }

  const uploadVoiceover = async (file) => {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const token = localStorage.getItem('welllogic_token')
      const res = await fetch(`${API_BASE}/api/voiceover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/mpeg',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: file,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Upload failed (${res.status})`)
      }
      await updateSettings('presentationVoiceover', {
        url: '/api/voiceover/file',
        updatedAt: new Date().toISOString(),
      })
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-5">
      {/* Voiceover */}
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <h3 className="text-[12px] font-bold text-white mb-1">Presentation Narration (Global)</h3>
        <p className="text-[11px] text-[#888] mb-3">
          Upload an MP3 to replace the narration for ALL users. The file saves to the server and plays automatically when anyone starts the presentation.
        </p>

        {serverVoiceover ? (
          <div className="mb-3 p-2 rounded-lg bg-[#0d1a0d] border border-[#1a2a1a] text-[11px] text-[#22c55e]">
            ✓ Server narration active — uploaded {new Date(serverVoiceover.updatedAt).toLocaleDateString()}
          </div>
        ) : (
          <div className="mb-3 p-2 rounded-lg bg-[#1a1a0a] border border-[#2a2a1a] text-[11px] text-[#eab308]">
            Using default narration: <span className="text-[#aaa]">Customer_Demo_Voice_Over.mp3</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/mp3,.mp3"
            onChange={e => uploadVoiceover(e.target.files?.[0])}
            disabled={uploading}
            className="block text-[11px] text-[#aaa] file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#E8200C] file:text-white file:font-bold hover:file:bg-[#c01a0a] disabled:opacity-50"
          />
          {uploading && <span className="text-[10px] text-[#888] animate-pulse">Uploading…</span>}
        </div>

        {uploadError && (
          <div className="mt-2 text-[10px] text-[#E8200C]">{uploadError}</div>
        )}

        <p className="text-[10px] text-[#555] mt-2">
          MP3 only · Max 50 MB · Replaces server file immediately for all active sessions on next load
        </p>
      </div>

      {/* Script panel default */}
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <h3 className="text-[12px] font-bold text-white mb-2">Script Panel Default</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={scriptDefault}
            onChange={e => updateSettings('demoPresentationScriptDefault', e.target.checked)}
            className="accent-[#E8200C]"
          />
          <span className="text-[11px] text-white">Show script/narrator panel by default when presentation starts</span>
        </label>
        <p className="text-[10px] text-[#666] mt-1">
          Users can toggle the panel during the presentation. This sets the initial state.
        </p>
      </div>

      {/* Per-scene timing */}
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[12px] font-bold text-white">Scene Durations</h3>
            <p className="text-[11px] text-[#888] mt-0.5">
              Set how long each scene displays before auto-advancing. Changes save globally.
            </p>
          </div>
          <button
            onClick={resetAllTimings}
            className="px-3 py-1 text-[10px] text-[#888] border border-[#333] rounded hover:text-white hover:border-[#555]"
          >
            Reset All
          </button>
        </div>

        <div className="space-y-1">
          {SCRIPT_STEPS.map((step, i) => {
            const overridden = timings[i] !== undefined
            const current = overridden ? timings[i] : step.defaultDuration
            const isLast = step.defaultDuration === 0

            return (
              <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${overridden ? 'border-[#E8200C]/30 bg-[#1a0a0a]' : 'border-[#1a1a2a] bg-[#090913]'}`}>
                <span className="text-[9px] text-[#555] w-5 shrink-0 text-right">{i + 1}</span>
                <span className="text-[11px] text-white flex-1 truncate">{step.title}</span>
                {isLast ? (
                  <span className="text-[10px] text-[#555] italic">stays until advanced</span>
                ) : (
                  <>
                    <input
                      type="number"
                      min="0"
                      max="60000"
                      step="500"
                      value={current}
                      onChange={e => updateTiming(i, parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-0.5 text-[11px] bg-[#050508] border border-[#333] rounded text-white text-right focus:border-[#E8200C] focus:outline-none"
                    />
                    <span className="text-[9px] text-[#555] w-5">ms</span>
                    <span className="text-[9px] text-[#888] w-10 text-right">{(current / 1000).toFixed(1)}s</span>
                    {overridden && (
                      <button
                        onClick={() => resetTiming(i)}
                        className="text-[9px] text-[#555] hover:text-[#E8200C] shrink-0"
                        title="Reset to default"
                      >
                        ↺
                      </button>
                    )}
                    {!overridden && <div className="w-3 shrink-0" />}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
