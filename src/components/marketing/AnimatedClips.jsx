import { useState } from 'react'

const CLIPS = [
  {
    id: 'trip-recovery',
    title: 'Compressor Trip Recovery',
    duration: '30 sec',
    description: 'Watch WellLogic automatically rebalance injection when a compressor goes down — protecting your highest-value wells in seconds, not hours.',
  },
  {
    id: 'priority',
    title: 'Well Prioritization in Action',
    duration: '25 sec',
    description: 'When gas supply drops, WellLogic ensures your top producers keep flowing. Lower-priority wells are curtailed first — automatically.',
  },
  {
    id: 'unload',
    title: 'Well Unload Detection',
    duration: '20 sec',
    description: 'Rapid pressure spike at the scrubber? WellLogic detects it instantly and opens the sales valve to prevent a full pad shutdown.',
  },
  {
    id: '2am',
    title: 'The 2AM Problem',
    duration: '35 sec',
    description: 'It\'s 2AM. Compressor trips. Nobody on-site. Without WellLogic: hours of lost production. With WellLogic: handled in 30 seconds.',
  },
]

export default function AnimatedClips() {
  const [playing, setPlaying] = useState(null)

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <h2 className="text-lg text-white font-bold mb-1" style={{ fontFamily: "'Arial Black'" }}>Product Explainer Videos</h2>
      <p className="text-[12px] text-[#888] mb-6">Animated demonstrations of WellLogic capabilities. Click to play.</p>

      <div className="grid grid-cols-2 gap-4">
        {CLIPS.map(clip => (
          <div key={clip.id} className="bg-[#111118] rounded-xl border border-[#222] overflow-hidden hover:border-[#E8200C]/50 transition-colors">
            {/* Video area */}
            <div className="relative bg-[#0a0a14] h-[220px] flex items-center justify-center overflow-hidden">
              {playing === clip.id ? (
                <ClipAnimation id={clip.id} onEnd={() => setPlaying(null)} />
              ) : (
                <button onClick={() => setPlaying(clip.id)}
                  className="flex flex-col items-center gap-3 group">
                  <div className="w-16 h-16 rounded-full bg-[#E8200C]/20 border-2 border-[#E8200C] flex items-center justify-center group-hover:bg-[#E8200C] transition-colors">
                    <span className="text-[#E8200C] text-2xl group-hover:text-white ml-1">▶</span>
                  </div>
                  <span className="text-[10px] text-[#888]">{clip.duration}</span>
                </button>
              )}
            </div>
            {/* Info */}
            <div className="p-4">
              <h3 className="text-[13px] text-white font-bold">{clip.title}</h3>
              <p className="text-[11px] text-[#888] mt-1 leading-relaxed">{clip.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// Animated clip scenes — pure SVG/CSS
// ═══════════════════════════════════════
function ClipAnimation({ id, onEnd }) {
  const [frame, setFrame] = useState(0)

  // Auto-advance frames
  useState(() => {
    const maxFrames = id === '2am' ? 7 : 6
    const interval = setInterval(() => {
      setFrame(f => {
        if (f >= maxFrames) { clearInterval(interval); setTimeout(onEnd, 2000); return f }
        return f + 1
      })
    }, id === '2am' ? 5000 : 4000)
    return () => clearInterval(interval)
  })

  if (id === 'trip-recovery') return <TripRecoveryClip frame={frame} />
  if (id === 'priority') return <PriorityClip frame={frame} />
  if (id === 'unload') return <UnloadClip frame={frame} />
  if (id === '2am') return <TwoAMClip frame={frame} />
  return null
}

function TripRecoveryClip({ frame }) {
  const stages = [
    { text: 'Normal Operations', sub: 'All compressors running. All wells at target injection rate.', color: '#22c55e', wells: [100,100,100,100] },
    { text: 'Compressor C1 Trips', sub: 'Unexpected shutdown. All wells immediately lose pressure.', color: '#E8200C', wells: [40,40,40,40] },
    { text: 'WellLogic Detects Shortfall', sub: 'System identifies reduced capacity within seconds.', color: '#eab308', wells: [40,40,35,30] },
    { text: 'Rebalancing by Priority', sub: 'Closing chokes on low-priority wells. Redirecting gas to top wells.', color: '#eab308', wells: [70,60,25,10] },
    { text: 'Priority Wells Recovered', sub: 'W1 and W2 back at target. W3-W4 curtailed to protect top producers.', color: '#22c55e', wells: [100,95,30,5] },
    { text: 'Stable — No Operator Needed', sub: 'Full production protected on priority wells. Zero manual intervention.', color: '#22c55e', wells: [100,100,25,0] },
  ]
  const s = stages[Math.min(frame, stages.length - 1)]
  return <ClipScene title={s.text} subtitle={s.sub} color={s.color} wells={s.wells} />
}

function PriorityClip({ frame }) {
  const stages = [
    { text: 'Full Gas Supply', sub: 'All 4 wells receiving target injection.', color: '#22c55e', wells: [100,100,100,100] },
    { text: 'Gas Supply Drops to 60%', sub: 'Formation decline or upstream restriction.', color: '#eab308', wells: [100,100,60,40] },
    { text: 'WellLogic Protects Top Wells', sub: 'W1 and W2 maintained. W3-W4 reduced proportionally.', color: '#eab308', wells: [100,100,40,20] },
    { text: 'Gas Drops Further to 40%', sub: 'Severe constraint. Only top wells get full gas.', color: '#E8200C', wells: [100,80,10,0] },
    { text: 'Your Best Wells Keep Producing', sub: 'W1 at 100%. Maximum revenue from limited supply.', color: '#E8200C', wells: [100,60,0,0] },
    { text: 'Supply Restored', sub: 'All wells return to target automatically.', color: '#22c55e', wells: [100,100,100,100] },
  ]
  const s = stages[Math.min(frame, stages.length - 1)]
  return <ClipScene title={s.text} subtitle={s.sub} color={s.color} wells={s.wells} />
}

function UnloadClip({ frame }) {
  const stages = [
    { text: 'Normal Operations', sub: 'Scrubber pressure stable. All systems nominal.', color: '#22c55e', psi: 85, valve: 0 },
    { text: 'Well Unload Event!', sub: 'Sudden gas slug — scrubber pressure spikes.', color: '#E8200C', psi: 130, valve: 0 },
    { text: 'WellLogic Opens Sales Valve', sub: 'Pressure relief to prevent shutdown.', color: '#eab308', psi: 115, valve: 75 },
    { text: 'Pressure Stabilizing', sub: 'Sales valve managing the surge. Compressors protected.', color: '#eab308', psi: 100, valve: 50 },
    { text: 'Back to Normal', sub: 'Pressure at target. Sales valve closing. Zero downtime.', color: '#22c55e', psi: 87, valve: 10 },
    { text: 'Shutdown Prevented', sub: 'Without WellLogic, this would have been a full pad trip.', color: '#22c55e', psi: 85, valve: 0 },
  ]
  const s = stages[Math.min(frame, stages.length - 1)]
  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-6">
      <div className="text-[14px] font-bold text-center" style={{ color: s.color, fontFamily: "'Arial Black'" }}>{s.text}</div>
      <div className="text-[11px] text-[#888] text-center mt-1 mb-4">{s.sub}</div>
      <div className="flex gap-8 items-end">
        <div className="text-center">
          <div className="text-[9px] text-[#888] mb-1">Scrubber PSI</div>
          <div className="w-16 h-24 bg-[#111] rounded border border-[#333] relative overflow-hidden">
            <div className="absolute bottom-0 w-full transition-all duration-1000" style={{ height: `${(s.psi/150)*100}%`, backgroundColor: s.psi > 110 ? '#E8200C' : '#22c55e' }} />
          </div>
          <div className="text-[12px] font-bold mt-1" style={{ color: s.psi > 110 ? '#E8200C' : '#22c55e' }}>{s.psi}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-[#888] mb-1">Sales Valve</div>
          <div className="w-16 h-24 bg-[#111] rounded border border-[#333] relative overflow-hidden">
            <div className="absolute bottom-0 w-full transition-all duration-1000" style={{ height: `${s.valve}%`, backgroundColor: s.valve > 50 ? '#eab308' : '#22c55e' }} />
          </div>
          <div className="text-[12px] font-bold mt-1" style={{ color: s.valve > 50 ? '#eab308' : '#22c55e' }}>{s.valve}%</div>
        </div>
      </div>
    </div>
  )
}

function TwoAMClip({ frame }) {
  const stages = [
    { text: '🌙 2:00 AM — All Quiet', sub: 'Pad unmanned. Nearest pumper is 90 minutes away.', color: '#4a4aff' },
    { text: '⚡ 2:03 AM — C1 Trips', sub: 'High discharge temp. Compressor shuts down.', color: '#E8200C' },
    { text: '📉 Production Dropping', sub: 'Without WellLogic: all wells losing injection. Revenue bleeding.', color: '#E8200C' },
    { text: '🟢 WellLogic Responds', sub: 'Auto-detects shortfall. Begins rebalancing in seconds.', color: '#eab308' },
    { text: '✅ Priority Wells Protected', sub: 'Top producers at full injection. 30 seconds total response.', color: '#22c55e' },
    { text: '💤 Meanwhile...', sub: 'Without WellLogic, production is still down. Pumper still driving.', color: '#E8200C' },
    { text: '📱 3:30 AM — Pumper Arrives', sub: 'WellLogic handled it 90 minutes ago. Your wells never stopped producing.', color: '#22c55e' },
  ]
  const s = stages[Math.min(frame, stages.length - 1)]
  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-8">
      <div className="text-[16px] font-bold text-center" style={{ color: s.color, fontFamily: "'Arial Black'" }}>{s.text}</div>
      <div className="text-[12px] text-[#999] text-center mt-2 max-w-[350px] leading-relaxed">{s.sub}</div>
    </div>
  )
}

function ClipScene({ title, subtitle, color, wells }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-6">
      <div className="text-[14px] font-bold text-center" style={{ color, fontFamily: "'Arial Black'" }}>{title}</div>
      <div className="text-[11px] text-[#888] text-center mt-1 mb-4">{subtitle}</div>
      <div className="flex gap-3">
        {wells.map((pct, i) => (
          <div key={i} className="text-center">
            <div className="text-[9px] text-[#888] mb-1">W{i + 1}</div>
            <div className="w-12 h-20 bg-[#111] rounded border border-[#333] relative overflow-hidden">
              <div className="absolute bottom-0 w-full transition-all duration-1000"
                style={{ height: `${pct}%`, backgroundColor: pct > 90 ? '#22c55e' : pct > 50 ? '#eab308' : pct > 10 ? '#E8200C' : '#333' }} />
            </div>
            <div className="text-[10px] font-bold mt-1" style={{ color: pct > 90 ? '#22c55e' : pct > 50 ? '#eab308' : '#E8200C' }}>{pct}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}
