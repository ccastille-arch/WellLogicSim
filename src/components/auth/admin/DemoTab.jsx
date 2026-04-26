import { useState, useRef } from 'react'
import { useAuth } from '../AuthProvider'

const API_BASE = import.meta.env.VITE_API_URL || ''

const SCRIPT_STEPS = [
  { title: 'Welcome', defaultDuration: 8000 },
  { title: 'Normal Operations', defaultDuration: 7000 },
  { title: 'Compressor Trips', defaultDuration: 3000 },
  { title: 'Impact', defaultDuration: 6000 },
  { title: 'Without Well Logic', defaultDuration: 12000 },
  { title: 'Well Logic Responds', defaultDuration: 10000 },
  { title: 'Priority Wells Protected', defaultDuration: 10000 },
  { title: 'Restoring', defaultDuration: 5000 },
  { title: 'Gas Supply Drops', defaultDuration: 4000 },
  { title: 'Priority Enforcement', defaultDuration: 12000 },
  { title: 'Restoring', defaultDuration: 4000 },
  { title: 'Well Unload Event', defaultDuration: 5000 },
  { title: 'Well Logic Handles It', defaultDuration: 10000 },
  { title: 'The Bottom Line', defaultDuration: 12000 },
  { title: 'ROI', defaultDuration: 8000 },
  { title: 'Questions', defaultDuration: 0 },
]

const MARKETING_CLIPS = [
  { id: 'well-pad-optimizer', title: 'Well Pad Optimizer (2:30)', settingsKey: 'clipVoiceover_well-pad-optimizer' },
  { id: 'what-is-welllogic', title: 'What It Does On Your Pad (45s)', settingsKey: 'clipVoiceover_what-is-welllogic' },
  { id: 'trip-sidebyside', title: 'Compressor Trip Side-by-Side (40s)', settingsKey: 'clipVoiceover_trip-sidebyside' },
]

const EXPORT_ASSETS = [
  { label: 'AutoPilot Narration MP3', href: '/api/voiceover/file', filename: 'autopilot-narration.mp3', note: 'Server upload only if active' },
  { label: 'Well Pad Optimizer narration', href: '/api/voiceover/clip/well-pad-optimizer', filename: 'well-pad-optimizer-narration.mp3', note: 'Server upload only if active' },
  { label: 'What It Does narration', href: '/api/voiceover/clip/what-is-welllogic', filename: 'what-is-welllogic-narration.mp3', note: 'Server upload only if active' },
  { label: 'Compressor Trip narration', href: '/api/voiceover/clip/trip-sidebyside', filename: 'trip-sidebyside-narration.mp3', note: 'Server upload only if active' },
  { label: 'Well Pad Optimizer animation', href: '/marketing/well-logic-optimizer.html', filename: 'well-logic-optimizer.html', note: 'Self-contained HTML' },
  { label: 'Customer Comms Spreadsheet', href: '/docs/Wellhead_Customer_Comms_AWI.xlsx', filename: 'Wellhead_Customer_Comms_AWI.xlsx', note: '' },
  { label: 'SCADA Registers Reference', href: '/docs/Wellhead_SCADA_AWI_Registers.xlsx', filename: 'Wellhead_SCADA_AWI_Registers.xlsx', note: '' },
  { label: 'Electrical Drawings 450hp', href: '/docs/Drawings_Electrical_450hp.pdf', filename: 'Drawings_Electrical_450hp.pdf', note: '' },
]

function VoiceoverUploadRow({ label, settingsKey, apiPath, settings, updateSettings }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)
  const current = settings[settingsKey]

  const upload = async (file) => {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const token = localStorage.getItem('welllogic_token')
      const res = await fetch(`${API_BASE}${apiPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/mpeg',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: file,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `Upload failed (${res.status})`)
      }
      await updateSettings(settingsKey, { url: data.url || apiPath, updatedAt: new Date().toISOString() })
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-start gap-3 py-2 border-b border-[#1a1a2a] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-white font-medium">{label}</div>
        {current ? (
          <div className="text-[10px] text-[#22c55e]">✓ Active — {new Date(current.updatedAt).toLocaleDateString()}</div>
        ) : (
          <div className="text-[10px] text-[#555]">No server file uploaded</div>
        )}
        {error && <div className="text-[10px] text-[#E8200C] mt-0.5">{error}</div>}
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {uploading && <span className="text-[10px] text-[#888] animate-pulse">Uploading…</span>}
        <input
          ref={inputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,.mp3"
          onChange={e => upload(e.target.files?.[0])}
          disabled={uploading}
          className="text-[10px] text-[#aaa] file:px-2 file:py-1 file:rounded file:border-0 file:bg-[#E8200C] file:text-white file:text-[10px] file:font-bold hover:file:bg-[#c01a0a] disabled:opacity-50"
        />
      </div>
    </div>
  )
}

export default function DemoTab() {
  const { settings, updateSettings } = useAuth()
  const timings = settings.demoPresentationTimings || {}
  const serverVoiceover = settings.presentationVoiceover
  const scriptDefault = settings.demoPresentationScriptDefault ?? true
  const clipSpeeds = settings.clipPlaybackSpeed || {}

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

  const resetAllTimings = () => updateSettings('demoPresentationTimings', {})

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
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || `Upload failed (${res.status})`)
      }
      await updateSettings('presentationVoiceover', { url: data.url || '/api/voiceover/file', updatedAt: new Date().toISOString() })
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-5">

      {/* ── AutoPilot Presentation ── */}
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <h3 className="text-[12px] font-bold text-white mb-1">AutoPilot Presentation Narration</h3>
        <p className="text-[11px] text-[#888] mb-3">
          Global MP3 that plays automatically when anyone starts the presentation. Falls back to the default Customer_Demo_Voice_Over.mp3.
        </p>
        {serverVoiceover ? (
          <div className="mb-3 p-2 rounded-lg bg-[#0d1a0d] border border-[#1a2a1a] text-[11px] text-[#22c55e]">
            ✓ Server narration active — uploaded {new Date(serverVoiceover.updatedAt).toLocaleDateString()}
          </div>
        ) : (
          <div className="mb-3 p-2 rounded-lg bg-[#1a1a0a] border border-[#2a2a1a] text-[11px] text-[#eab308]">
            Using default: <span className="text-[#aaa]">Customer_Demo_Voice_Over.mp3</span>
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
        {uploadError && <div className="mt-2 text-[10px] text-[#E8200C]">{uploadError}</div>}
        <p className="text-[10px] text-[#555] mt-2">MP3 only · Max 50 MB</p>
      </div>

      {/* ── Script Panel Default ── */}
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <h3 className="text-[12px] font-bold text-white mb-2">Script Panel Default</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={scriptDefault}
            onChange={e => updateSettings('demoPresentationScriptDefault', e.target.checked)}
            className="accent-[#E8200C]"
          />
          <span className="text-[11px] text-white">Show narrator panel by default when presentation starts</span>
        </label>
        <p className="text-[10px] text-[#666] mt-1">Users can toggle during the presentation via the ▶| Script button.</p>
      </div>

      {/* ── Scene Durations ── */}
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[12px] font-bold text-white">AutoPilot Scene Durations</h3>
            <p className="text-[11px] text-[#888] mt-0.5">How long each scene displays before auto-advancing. Saves globally.</p>
          </div>
          <button onClick={resetAllTimings} className="px-3 py-1 text-[10px] text-[#888] border border-[#333] rounded hover:text-white">Reset All</button>
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
                      type="number" min="0" max="60000" step="500" value={current}
                      onChange={e => updateTiming(i, parseInt(e.target.value) || 0)}
                      className="w-20 px-2 py-0.5 text-[11px] bg-[#050508] border border-[#333] rounded text-white text-right focus:border-[#E8200C] focus:outline-none"
                    />
                    <span className="text-[9px] text-[#555] w-5">ms</span>
                    <span className="text-[9px] text-[#888] w-10 text-right">{(current / 1000).toFixed(1)}s</span>
                    {overridden
                      ? <button onClick={() => resetTiming(i)} className="text-[9px] text-[#555] hover:text-[#E8200C]" title="Reset">↺</button>
                      : <div className="w-3" />}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Marketing Video Narrations ── */}
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <h3 className="text-[12px] font-bold text-white mb-1">Marketing Video Narrations</h3>
        <p className="text-[11px] text-[#888] mb-3">
          Upload a server-side MP3 for each marketing video. Saves globally — all users hear the same track.
        </p>
        <div className="space-y-1">
          {MARKETING_CLIPS.map(clip => (
            <VoiceoverUploadRow
              key={clip.id}
              label={clip.title}
              settingsKey={clip.settingsKey}
              apiPath={`/api/voiceover/clip/${clip.id}`}
              settings={settings}
              updateSettings={updateSettings}
            />
          ))}
        </div>
      </div>

      {/* ── Marketing Video Speed ── */}
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <h3 className="text-[12px] font-bold text-white mb-1">Marketing Video Playback Speed</h3>
        <p className="text-[11px] text-[#888] mb-3">
          Multiplier applied to each clip's frame timing. 1.0 = normal, 2.0 = twice as fast.
        </p>
        <div className="space-y-2">
          {MARKETING_CLIPS.map(clip => {
            const val = clipSpeeds[clip.id] ?? 1.0
            return (
              <div key={clip.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[#1a1a2a] bg-[#090913]">
                <span className="text-[11px] text-white flex-1 truncate">{clip.title}</span>
                <input
                  type="range" min="0.25" max="3" step="0.25" value={val}
                  onChange={e => updateSettings('clipPlaybackSpeed', { ...clipSpeeds, [clip.id]: parseFloat(e.target.value) })}
                  className="w-24 accent-[#E8200C]"
                />
                <span className="text-[11px] text-white w-10 text-right">{val.toFixed(2)}×</span>
                {val !== 1.0 && (
                  <button
                    onClick={() => updateSettings('clipPlaybackSpeed', { ...clipSpeeds, [clip.id]: 1.0 })}
                    className="text-[9px] text-[#555] hover:text-[#E8200C]"
                    title="Reset to 1×"
                  >↺</button>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-[#555] mt-2">Note: the Well Pad Optimizer runs in a self-contained iframe — speed control applies to the other two clips only.</p>
      </div>

      {/* ── Export / Downloads ── */}
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <h3 className="text-[12px] font-bold text-white mb-1">Export & Downloads</h3>
        <p className="text-[11px] text-[#888] mb-3">Download any asset to your local device. Narration files only exist if previously uploaded to the server.</p>
        <div className="grid grid-cols-2 gap-2">
          {EXPORT_ASSETS.map(asset => (
            <a
              key={asset.href}
              href={`${API_BASE}${asset.href}`}
              download={asset.filename}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-2 p-3 rounded-lg border border-[#1a1a2a] bg-[#090913] hover:border-[#E8200C]/40 hover:bg-[#12080a] transition-colors group"
            >
              <span className="text-[16px] shrink-0 mt-0.5">⬇</span>
              <div className="min-w-0">
                <div className="text-[11px] text-white group-hover:text-[#E8200C] font-medium truncate">{asset.label}</div>
                {asset.note && <div className="text-[9px] text-[#555]">{asset.note}</div>}
                <div className="text-[9px] text-[#444] font-mono truncate">{asset.filename}</div>
              </div>
            </a>
          ))}
        </div>
      </div>

    </div>
  )
}
