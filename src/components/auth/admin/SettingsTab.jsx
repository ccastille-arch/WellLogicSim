import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../AuthProvider'
import {
  COMPRESSOR_DEFAULT_VISIBLE_LABELS,
  LIVE_DATA_DEVICES,
  getDetectedCompressorRegisters,
  getDetectedLiveRegisters,
  isDefaultLiveRegisterVisible,
  loadAwiRegisterCatalog,
  parseLiveDatapoints,
} from '../../../engine/liveRegisters'

const API_BASE = import.meta.env.VITE_API_URL || ''

async function fetchDevice(deviceId) {
  try {
    const res = await fetch(`${API_BASE}/api/mlink/device?deviceId=${encodeURIComponent(deviceId)}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default function SettingsTab() {
  const { settings, updateSettings } = useAuth()
  const [registerCatalog, setRegisterCatalog] = useState([])
  const [livePanelMap, setLivePanelMap] = useState({})
  const [compADataMap, setCompADataMap] = useState({})
  const [compBDataMap, setCompBDataMap] = useState({})
  const [registerLoading, setRegisterLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadRegisterControls() {
      setRegisterLoading(true)
      try {
        const [catalog, panelResponse, compAResponse, compBResponse] = await Promise.all([
          loadAwiRegisterCatalog(),
          fetchDevice(LIVE_DATA_DEVICES.panel),
          fetchDevice(LIVE_DATA_DEVICES.compA),
          fetchDevice(LIVE_DATA_DEVICES.compB),
        ])

        if (!mounted) return
        setRegisterCatalog(catalog)
        setLivePanelMap(parseLiveDatapoints(panelResponse))
        setCompADataMap(parseLiveDatapoints(compAResponse))
        setCompBDataMap(parseLiveDatapoints(compBResponse))
      } finally {
        if (mounted) setRegisterLoading(false)
      }
    }

    loadRegisterControls()
    return () => { mounted = false }
  }, [])

  const registerVisibility = settings.liveDataRegisterVisibility || {}
  const compressorVisibility = settings.liveDataCompressorVisibility || {}
  const detectedRegisters = useMemo(
    () => getDetectedLiveRegisters(livePanelMap, registerCatalog),
    [livePanelMap, registerCatalog],
  )
  const detectedCompressorRegisters = useMemo(
    () => getDetectedCompressorRegisters(compADataMap, compBDataMap),
    [compADataMap, compBDataMap],
  )

  const groupedRegisters = useMemo(() => {
    const groups = new Map()

    detectedRegisters.forEach((meta) => {
      if (!groups.has(meta.groupId)) {
        groups.set(meta.groupId, { id: meta.groupId, label: meta.groupLabel, items: [] })
      }
      groups.get(meta.groupId).items.push(meta)
    })

    return [...groups.values()]
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
      .map(group => ({
        ...group,
        items: group.items.sort((a, b) => a.register.localeCompare(b.register, undefined, { numeric: true })),
      }))
  }, [detectedRegisters])

  const toggleRegister = (meta, checked) => {
    updateSettings('liveDataRegisterVisibility', {
      ...registerVisibility,
      [meta.id]: checked,
    })
  }

  const toggleCompressorRegister = (meta, checked) => {
    updateSettings('liveDataCompressorVisibility', {
      ...compressorVisibility,
      [meta.label]: checked,
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <h3 className="text-[12px] font-bold text-white mb-3">General</h3>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!settings.forumPublic}
            onChange={e => updateSettings('forumPublic', e.target.checked)}
            className="accent-[#D32028]" />
          <span className="text-[11px] text-white">Forum visible to all users</span>
        </label>
      </div>

      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <h3 className="text-[12px] font-bold text-white mb-2">Branding</h3>
        <p className="text-[11px] text-[#888]">
          The simulator now uses the Well Logic brand mark everywhere. Logo voting and alternate logo selection have been removed.
        </p>
      </div>

      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-[12px] font-bold text-white">Live Data Register Visibility</h3>
            <p className="text-[11px] text-[#888] mt-1">
              These toggles come from the AWI register sheet and only appear when the live panel is returning a valid value for that register.
            </p>
          </div>
          <div className="text-right text-[10px] text-[#666]">
            <div>{detectedRegisters.length} valid live registers detected</div>
            <div>Default useful fields come on automatically</div>
          </div>
        </div>

        {registerLoading ? (
          <div className="text-[11px] text-[#666]">Loading live register list...</div>
        ) : groupedRegisters.length === 0 ? (
          <div className="text-[11px] text-[#666]">
            No valid live panel registers were detected right now.
          </div>
        ) : (
          <div className="space-y-4">
            {groupedRegisters.map(group => (
              <div key={group.id} className="rounded-lg border border-[#232336] bg-[#090913] p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#f97316] mb-2">
                  {group.label}
                </div>
                <div className="space-y-2">
                  {group.items.map(meta => {
                    const checked = registerVisibility[meta.id]
                    const isVisible = checked == null ? isDefaultLiveRegisterVisible(meta) : !!checked

                    return (
                      <label key={meta.id} className="flex items-start gap-3 cursor-pointer rounded border border-[#1d1d2b] bg-[#0d0d18] px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={e => toggleRegister(meta, e.target.checked)}
                          className="mt-0.5 accent-[#D32028]"
                        />
                        <div className="min-w-0">
                          <div className="text-[11px] text-white font-bold">{meta.label}</div>
                          <div className="text-[9px] text-[#666] mt-0.5">
                            Register {meta.register}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-[12px] font-bold text-white">Live Compressor Visibility</h3>
            <p className="text-[11px] text-[#888] mt-1">
              These are the compressor parameters from your MLink compressor export. They only show on the live page when the compressor feed returns a valid value.
            </p>
          </div>
          <div className="text-right text-[10px] text-[#666]">
            <div>{detectedCompressorRegisters.length} valid compressor fields detected</div>
            <div>CSV fields default on automatically</div>
          </div>
        </div>

        {registerLoading ? (
          <div className="text-[11px] text-[#666]">Loading compressor register list...</div>
        ) : detectedCompressorRegisters.length === 0 ? (
          <div className="text-[11px] text-[#666]">
            No valid live compressor fields were detected right now.
          </div>
        ) : (
          <div className="space-y-2">
            {detectedCompressorRegisters.map(meta => {
              const checked = compressorVisibility[meta.label]
              const isVisible = checked == null ? COMPRESSOR_DEFAULT_VISIBLE_LABELS.includes(meta.label) : !!checked

              return (
                <label key={meta.id} className="flex items-start gap-3 cursor-pointer rounded border border-[#1d1d2b] bg-[#0d0d18] px-3 py-2">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={e => toggleCompressorRegister(meta, e.target.checked)}
                    className="mt-0.5 accent-[#D32028]"
                  />
                  <div className="min-w-0">
                    <div className="text-[11px] text-white font-bold">{meta.label}</div>
                    <div className="text-[9px] text-[#666] mt-0.5">
                      Source field {meta.register}
                    </div>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
