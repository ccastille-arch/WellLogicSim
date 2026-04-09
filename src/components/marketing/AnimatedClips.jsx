import { useState, useEffect, useRef } from 'react'

const CLIPS = [
  {
    id: 'what-is-welllogic',
    title: 'What is WellLogic™?',
    duration: '60 sec',
    description: 'Full overview of what WellLogic is, how it sits on your pad, and what it controls — from wells to compressors to injection chokes.',
  },
  {
    id: 'trip-sidebyside',
    title: 'Compressor Trip — Manual vs WellLogic',
    duration: '45 sec',
    description: 'Side-by-side comparison: watch the same compressor trip event play out with and without WellLogic controlling the pad.',
  },
]

export default function AnimatedClips() {
  const [playing, setPlaying] = useState(null)

  const stopPlaying = () => {
    stopSpeaking()
    setPlaying(null)
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <h2 className="text-lg text-white font-bold mb-1" style={{ fontFamily: "'Arial Black'" }}>Product Videos</h2>
      <p className="text-[12px] text-[#888] mb-6">Animated demonstrations showing WellLogic in action on a live pad diagram.</p>

      <div className="space-y-6">
        {CLIPS.map(clip => (
          <div key={clip.id} className="bg-[#111118] rounded-xl border border-[#222] overflow-hidden">
            {/* Video area — 16:9 */}
            <div className="relative bg-[#060610] overflow-hidden" style={{ aspectRatio: '16/9' }}>
              {playing === clip.id ? (
                <div className="w-full h-full relative">
                  <ClipPlayer id={clip.id} onEnd={stopPlaying} />
                  <button onClick={stopPlaying}
                    className="absolute top-3 right-3 bg-[#111]/80 border border-[#444] rounded px-3 py-1 text-[10px] text-[#ccc] hover:text-white hover:bg-[#E8200C] z-10">
                    ■ Stop
                  </button>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[13px] text-[#888] mb-3">{clip.title}</div>
                  <button onClick={() => setPlaying(clip.id)}
                    className="w-20 h-20 rounded-full bg-[#E8200C]/20 border-2 border-[#E8200C] flex items-center justify-center hover:bg-[#E8200C] transition-colors group">
                    <span className="text-[#E8200C] text-3xl group-hover:text-white ml-1">▶</span>
                  </button>
                  <span className="text-[10px] text-[#555] mt-3">{clip.duration}</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-[14px] text-white font-bold">{clip.title}</h3>
              <p className="text-[11px] text-[#888] mt-1">{clip.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// NARRATION ENGINE — browser text-to-speech
// Picks the best available English voice (deep male preferred for industrial product)
// Can be swapped to ElevenLabs/OpenAI TTS later by replacing speak()
// ═══════════════════════════════════════
function getVoice() {
  const voices = window.speechSynthesis?.getVoices() || []
  // Prefer a deep male English voice
  const preferred = ['Google UK English Male', 'Microsoft David', 'Microsoft Mark', 'Daniel', 'Alex',
    'Google US English', 'Microsoft Guy Online', 'en-US', 'en-GB']
  for (const name of preferred) {
    const found = voices.find(v => v.name.includes(name) || v.lang.startsWith(name))
    if (found) return found
  }
  return voices.find(v => v.lang.startsWith('en')) || voices[0] || null
}

function speak(text, onDone) {
  if (!window.speechSynthesis) { onDone?.(); return }
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.rate = 0.92 // slightly slower for clarity
  utter.pitch = 0.9 // slightly deeper
  utter.volume = 1
  const voice = getVoice()
  if (voice) utter.voice = voice
  utter.onend = () => onDone?.()
  utter.onerror = () => onDone?.()
  window.speechSynthesis.speak(utter)
}

function stopSpeaking() {
  window.speechSynthesis?.cancel()
}

// Preload voices (Chrome loads them async)
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices()
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
}

// Narration scripts for each video
const NARRATION = {
  'what-is-welllogic': [
    'This is a gas lift injection pad in West Texas.',
    'Wells produce oil and gas. The gas is separated at the scrubber and recirculated back to the wells.',
    'Compressors push gas through the discharge header to each well.',
    'Each well has an injection choke valve that controls how much gas it receives.',
    'Flow meters on every line measure the actual injection rate in real time.',
    'Well Logic sits at the center of it all, controlling every choke valve automatically.',
    'It monitors suction pressure, discharge pressure, and every compressor on the pad.',
    'When conditions change, Well Logic reacts in seconds. Not hours.',
    'It prioritizes your highest value wells automatically. Your best producers always get gas first.',
    'It detects well unloads and pressure spikes, and prevents full pad shutdowns.',
    'It stages compressors up and down based on actual demand. No wasted fuel.',
    'Well Logic. Twenty four seven automatic gas lift optimization by Service Compression.',
  ],
  'trip-sidebyside': [
    'Both pads are running normally. Four wells, two compressors, full injection on both sides.',
    'Compressor C 1 trips. Both pads lose a compressor at the exact same time.',
    'Immediately, all wells on both pads lose injection pressure. Production is dropping.',
    'On the left, the manual pad fires a SCADA alarm and dispatches the operator. On the right, Well Logic has already detected the shortfall.',
    'The operator is driving to the pad. Forty five minutes away. Meanwhile, Well Logic is already closing chokes on low priority wells and redirecting gas.',
    'All wells on the manual pad are still suffering. On the Well Logic pad, priority wells W 1 and W 2 are already back at full target injection.',
    'The operator finally arrives at the manual pad and starts diagnosing the problem. Well Logic has been stable for over thirty minutes already.',
    'The operator calls a mechanic and waits. On the Well Logic pad, top producers have been running at full rate this entire time.',
    'After the mechanic fixes the compressor, the operator has to drive back out to manually readjust every choke. With Well Logic, that second trip never happens.',
  ],
}

// ═══════════════════════════════════════
// VIDEO PLAYER — drives frame-by-frame animation + narration
// ═══════════════════════════════════════
function ClipPlayer({ id, onEnd }) {
  const [frame, setFrame] = useState(-1) // -1 = not started yet
  const [tick, setTick] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const intervalRef = useRef(null)
  const frameRef = useRef(-1)

  const narrationLines = NARRATION[id] || []
  const totalFrames = narrationLines.length

  // Start first frame narration
  useEffect(() => {
    // Small delay then start frame 0
    const t = setTimeout(() => advanceFrame(0), 500)
    return () => { clearTimeout(t); stopSpeaking() }
  }, [])

  // Tick for visual animations within a frame
  useEffect(() => {
    intervalRef.current = setInterval(() => setTick(t => t + 1), 500)
    return () => clearInterval(intervalRef.current)
  }, [])

  const advanceFrame = (nextFrame) => {
    if (nextFrame >= totalFrames) {
      // Video done
      stopSpeaking()
      setTimeout(onEnd, 2000)
      return
    }
    frameRef.current = nextFrame
    setFrame(nextFrame)
    setSpeaking(true)

    // Speak the narration for this frame, then advance to next when done
    speak(narrationLines[nextFrame], () => {
      setSpeaking(false)
      // Pause briefly between frames, then advance
      setTimeout(() => advanceFrame(frameRef.current + 1), 800)
    })
  }

  const displayFrame = Math.max(0, frame)

  if (id === 'what-is-welllogic') return <WhatIsWellLogicVideo frame={displayFrame} tick={tick} />
  if (id === 'trip-sidebyside') return <TripSideBySideVideo frame={displayFrame} tick={tick} />
  return null
}

// ═══════════════════════════════════════
// VIDEO 1: What is WellLogic?
// ═══════════════════════════════════════
function WhatIsWellLogicVideo({ frame, tick }) {
  const narration = [
    'This is a gas lift injection pad in West Texas.',
    'Wells produce oil and gas. The gas is separated and recirculated.',
    'Compressors push gas through a discharge header to each well.',
    'Each well has an injection choke valve controlling how much gas it receives.',
    'Flow meters measure the actual injection rate on every well.',
    'WellLogic sits at the center — controlling every choke valve in real-time.',
    'It monitors suction pressure, discharge pressure, and every compressor.',
    'When conditions change, WellLogic reacts in seconds — not hours.',
    'It prioritizes your highest-value wells automatically.',
    'It detects well unloads and prevents shutdowns.',
    'It stages compressors based on demand — no wasted fuel.',
    'WellLogic — 24/7 automatic gas lift optimization.',
  ]

  const caption = narration[Math.min(frame, narration.length - 1)]

  // Highlight different parts of the diagram based on frame
  const highlightWells = frame >= 0 && frame <= 1
  const highlightComps = frame >= 2 && frame <= 3
  const highlightChokes = frame >= 3 && frame <= 5
  const highlightWellLogic = frame >= 5 && frame <= 8
  const highlightAll = frame >= 9

  return (
    <div className="w-full h-full flex flex-col">
      {/* Animated P&ID */}
      <div className="flex-1 relative">
        <svg viewBox="0 0 800 380" className="w-full h-full" preserveAspectRatio="xMidYMid meet" style={{ fontFamily: 'Arial' }}>
          <rect width="800" height="380" fill="#060610" />

          {/* Title bar */}
          <rect x="0" y="0" width="800" height="24" fill="#0c0c18" />
          <text x="400" y="16" textAnchor="middle" fill="#333" fontSize="9" fontWeight="bold" letterSpacing="3">SITE OVERVIEW — PAD OPTIMIZATION</text>

          {/* WELLS (top) */}
          {[0,1,2,3].map(i => {
            const x = 100 + i * 170
            const glow = highlightWells || highlightAll
            return (
              <g key={`w${i}`}>
                <rect x={x} y={40} width={70} height={45} rx={3} fill="#0a0a16"
                  stroke={glow ? '#22c55e' : '#333'} strokeWidth={glow ? 2 : 1} />
                {glow && <rect x={x} y={40} width={70} height={45} rx={3} fill="#22c55e" opacity={0.08} />}
                <text x={x+35} y={36} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">W{i+1}</text>
                <text x={x+35} y={57} textAnchor="middle" fill="#555" fontSize="7">Priority {i+1}</text>
                <text x={x+35} y={68} textAnchor="middle" fill="#22c55e" fontSize="8" fontWeight="bold">150 MCFD</text>
                {/* Prod line up */}
                <line x1={x+35} y1={40} x2={x+35} y2={30} stroke="#8B6914" strokeWidth={1.5} strokeDasharray="4 3"
                  className="flow-line-animated" style={{ '--flow-speed': '2s' }} />
              </g>
            )
          })}

          {/* Production header */}
          <line x1="90" y1="30" x2="710" y2="30" stroke="#8B6914" strokeWidth={4} opacity={0.3} />
          <text x="80" y="28" textAnchor="end" fill="#8B6914" fontSize="7" fontWeight="bold">PROD HDR</text>

          {/* CHOKES + FLOW METERS (below wells) */}
          {[0,1,2,3].map(i => {
            const x = 135 + i * 170
            const glow = highlightChokes || highlightAll
            return (
              <g key={`chk${i}`}>
                {/* Injection line */}
                <line x1={x} y1={85} x2={x} y2={130} stroke="#22c55e" strokeWidth={1.5}
                  strokeDasharray="4 3" className="flow-line-animated" style={{ '--flow-speed': '1.5s' }} />
                {/* Choke */}
                <polygon points={`${x-6},${130-6} ${x},${130} ${x-6},${130+6}`} fill={glow ? '#22c55e' : '#555'} />
                <polygon points={`${x+6},${130-6} ${x},${130} ${x+6},${130+6}`} fill={glow ? '#22c55e' : '#555'} />
                {glow && <text x={x+12} y={133} fill="#22c55e" fontSize="6" fontWeight="bold">CHK{i+1}</text>}
                {/* Flow meter */}
                <circle cx={x} cy={150} r={7} fill="#0a0a16" stroke={glow ? '#3b82f6' : '#333'} strokeWidth={1} />
                <text x={x} y={152} textAnchor="middle" fill="#3b82f6" fontSize="5" fontWeight="bold">FM</text>
                {/* Line to discharge hdr */}
                <line x1={x} y1={157} x2={x} y2={175} stroke="#22c55e" strokeWidth={1.5}
                  strokeDasharray="4 3" className="flow-line-animated" style={{ '--flow-speed': '1.5s' }} />
              </g>
            )
          })}

          {/* Discharge header */}
          <line x1="90" y1="175" x2="710" y2="175" stroke="#22c55e" strokeWidth={4} opacity={0.3} />
          <text x="80" y="173" textAnchor="end" fill="#22c55e" fontSize="7" fontWeight="bold">DISCH HDR</text>

          {/* COMPRESSORS */}
          {[0,1].map(i => {
            const x = 220 + i * 280
            const glow = highlightComps || highlightAll
            return (
              <g key={`c${i}`}>
                <line x1={x+35} y1={175} x2={x+35} y2={210} stroke="#22c55e" strokeWidth={1.5}
                  strokeDasharray="4 3" className="flow-line-animated" style={{ '--flow-speed': '1.5s' }} />
                <rect x={x} y={210} width={70} height={50} rx={4} fill="#0a0a16"
                  stroke={glow ? '#22c55e' : '#333'} strokeWidth={glow ? 2 : 1} />
                {glow && <rect x={x} y={210} width={70} height={50} rx={4} fill="#22c55e" opacity={0.08} />}
                <circle cx={x+14} cy={224} r={4} fill="#22c55e" />
                <text x={x+24} y={227} fill="#fff" fontSize="9" fontWeight="bold">C{i+1}</text>
                <text x={x+65} y={227} textAnchor="end" fill="#22c55e" fontSize="6">RUN</text>
                <text x={x+7} y={240} fill="#888" fontSize="6">300 MCFD / 400</text>
                <text x={x+7} y={250} fill="#888" fontSize="6">Load 75%</text>
                {/* Line down to suction */}
                <line x1={x+35} y1={260} x2={x+35} y2={290} stroke="#f97316" strokeWidth={1.5}
                  strokeDasharray="4 3" className="flow-line-animated" style={{ '--flow-speed': '1.5s' }} />
              </g>
            )
          })}

          {/* Suction header */}
          <line x1="200" y1="290" x2="600" y2="290" stroke="#f97316" strokeWidth={4} opacity={0.3} />
          <text x="190" y="288" textAnchor="end" fill="#f97316" fontSize="7" fontWeight="bold">SUCTION HDR</text>

          {/* WellLogic box — center highlight */}
          <rect x={330} y={310} width={140} height={35} rx={6} fill="#0a0a16"
            stroke={highlightWellLogic || highlightAll ? '#E8200C' : '#333'}
            strokeWidth={highlightWellLogic || highlightAll ? 2.5 : 1} />
          {(highlightWellLogic || highlightAll) && <rect x={330} y={310} width={140} height={35} rx={6} fill="#E8200C" opacity={0.1} />}
          <text x={400} y={326} textAnchor="middle" fill="#E8200C" fontSize="10" fontWeight="bold">WellLogic™</text>
          <text x={400} y={338} textAnchor="middle" fill="#888" fontSize="7">Pad Optimization Controller</text>

          {/* Scrubber (right) */}
          <rect x={650} y={60} width={90} height={50} rx={6} fill="#0a0a16" stroke="#888" strokeWidth={1} />
          <text x={695} y={80} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">HP SCRUBBER</text>
          <text x={695} y={95} textAnchor="middle" fill="#f97316" fontSize="8" fontWeight="bold">95 PSI</text>

          {/* Recirc line from scrubber to suction */}
          <line x1={695} y1={110} x2={695} y2={290} stroke="#22c55e" strokeWidth={1.5}
            strokeDasharray="4 3" className="flow-line-animated" style={{ '--flow-speed': '2s' }} />
          <text x={700} y={200} fill="#22c55e" fontSize="6" fontWeight="bold" transform="rotate(90,700,200)">RECIRC</text>
        </svg>
      </div>

      {/* Caption bar */}
      <div className="bg-[#0c0c18] px-6 py-3 text-center border-t border-[#1a1a2a]">
        <p className="text-[14px] text-white font-medium">{caption}</p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// VIDEO 2: Compressor Trip — Side by Side
// ═══════════════════════════════════════
function TripSideBySideVideo({ frame, tick }) {
  const narration = [
    'Both pads are running normally. 4 wells, 2 compressors, full injection.',
    '⚡ COMPRESSOR C1 TRIPS — both pads lose a compressor at the same time.',
    'All wells immediately lose injection pressure on both pads.',
    'LEFT: Manual pad — SCADA alarm fires. Dispatching operator. RIGHT: WellLogic detecting shortfall.',
    'LEFT: Operator driving to pad (45 min). Production still down. RIGHT: WellLogic rebalancing chokes.',
    'LEFT: Still waiting. All wells suffering. RIGHT: Priority wells W1 and W2 back at target.',
    'LEFT: Operator arrives. Starts diagnosing. RIGHT: WellLogic stable. Top wells producing.',
    'LEFT: Calls mechanic. Waits 60 min. RIGHT: WellLogic been stable for over an hour already.',
    'LEFT: Mechanic fixes comp. Operator drives BACK to readjust chokes. RIGHT: Already handled.',
  ]

  const caption = narration[Math.min(frame, narration.length - 1)]

  // State for both sides
  const c1Down = frame >= 1
  const manualWells = frame <= 0 ? [100,100,100,100]
    : frame <= 5 ? [20,20,15,10]
    : frame <= 7 ? [30,25,20,15]
    : [80,70,60,50]

  const wlWells = frame <= 0 ? [100,100,100,100]
    : frame <= 1 ? [40,40,40,40]
    : frame <= 2 ? [55,45,30,20]
    : frame <= 3 ? [80,60,20,10]
    : [100,95,25,5]

  const manualC1 = c1Down ? 'tripped' : 'running'
  const wlC1 = c1Down ? 'tripped' : 'running'

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 flex">
        {/* LEFT: Manual */}
        <div className="flex-1 border-r border-[#333] relative">
          <div className="absolute top-2 left-0 right-0 text-center">
            <span className="bg-[#E8200C]/20 text-[#E8200C] px-3 py-1 rounded text-[10px] font-bold">❌ WITHOUT WELLLOGIC — MANUAL</span>
          </div>
          <MiniPad wells={manualWells} c1Status={manualC1} c2Status="running" showWellLogic={false} />
          {frame >= 3 && frame < 8 && (
            <div className="absolute bottom-8 left-4 right-4 bg-[#1a0808] rounded p-2 border border-[#E8200C]/30">
              <div className="text-[9px] text-[#E8200C]">
                {frame < 5 ? '🚗 Operator driving to pad...' : frame < 7 ? '🔍 Diagnosing / waiting for mechanic...' : '🔧 Mechanic fixing / Operator returning to readjust chokes...'}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: WellLogic */}
        <div className="flex-1 relative">
          <div className="absolute top-2 left-0 right-0 text-center">
            <span className="bg-[#22c55e]/20 text-[#22c55e] px-3 py-1 rounded text-[10px] font-bold">✅ WITH WELLLOGIC — AUTOMATIC</span>
          </div>
          <MiniPad wells={wlWells} c1Status={wlC1} c2Status="running" showWellLogic={true} />
          {frame >= 3 && (
            <div className="absolute bottom-8 left-4 right-4 bg-[#081a08] rounded p-2 border border-[#22c55e]/30">
              <div className="text-[9px] text-[#22c55e]">
                {frame < 4 ? '⚡ WellLogic rebalancing chokes by priority...' : '✅ Priority wells at target. No operator needed.'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Caption */}
      <div className="bg-[#0c0c18] px-6 py-3 text-center border-t border-[#1a1a2a]">
        <p className="text-[13px] text-white font-medium">{caption}</p>
      </div>
    </div>
  )
}

// Mini pad diagram for the side-by-side video
function MiniPad({ wells, c1Status, c2Status, showWellLogic }) {
  return (
    <svg viewBox="0 0 400 280" className="w-full h-full" preserveAspectRatio="xMidYMid meet" style={{ fontFamily: 'Arial' }}>
      <rect width="400" height="280" fill="#060610" />

      {/* Wells */}
      {wells.map((pct, i) => {
        const x = 50 + i * 85
        const color = pct > 90 ? '#22c55e' : pct > 50 ? '#eab308' : pct > 10 ? '#E8200C' : '#333'
        return (
          <g key={i}>
            <rect x={x} y={35} width={55} height={35} rx={3} fill="#0a0a16" stroke={color} strokeWidth={1.5} />
            <text x={x+27} y={28} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="bold">W{i+1}</text>
            <text x={x+27} y={52} textAnchor="middle" fill={color} fontSize="8" fontWeight="bold">{pct}%</text>
            {/* Flow indicator */}
            <rect x={x+20} y={58} width={15} height={3} rx={1} fill="#111" />
            <rect x={x+20} y={58} width={15 * pct / 100} height={3} rx={1} fill={color} />
            {/* Line to discharge */}
            <line x1={x+27} y1={70} x2={x+27} y2={90} stroke={pct > 10 ? '#22c55e' : '#222'} strokeWidth={1}
              strokeDasharray="3 3" className={pct > 10 ? 'flow-line-animated' : ''} style={{ '--flow-speed': '1.5s' }} />
          </g>
        )
      })}

      {/* Discharge header */}
      <line x1="40" y1="90" x2="370" y2="90" stroke="#22c55e" strokeWidth={3} opacity={0.3} />

      {/* Compressors */}
      {[{ x: 100, status: c1Status, name: 'C1' }, { x: 250, status: c2Status, name: 'C2' }].map((c, i) => {
        const running = c.status === 'running'
        const color = running ? '#22c55e' : '#E8200C'
        return (
          <g key={i}>
            <line x1={c.x+25} y1={90} x2={c.x+25} y2={110} stroke={running ? '#22c55e' : '#222'} strokeWidth={1.5}
              strokeDasharray="3 3" className={running ? 'flow-line-animated' : ''} style={{ '--flow-speed': '1.5s' }} />
            <rect x={c.x} y={110} width={50} height={35} rx={3} fill="#0a0a16" stroke={color} strokeWidth={1.5} />
            {!running && <rect x={c.x} y={110} width={50} height={35} rx={3} fill="#E8200C" opacity={0.15} />}
            <circle cx={c.x+12} cy={122} r={3} fill={color} />
            <text x={c.x+20} y={125} fill="#fff" fontSize="8" fontWeight="bold">{c.name}</text>
            <text x={c.x+45} y={125} textAnchor="end" fill={color} fontSize="6">{running ? 'RUN' : 'TRIP'}</text>
            <text x={c.x+5} y={138} fill="#888" fontSize="6">{running ? 'Load 75%' : 'OFFLINE'}</text>
            {/* Line to suction */}
            <line x1={c.x+25} y1={145} x2={c.x+25} y2={165} stroke={running ? '#f97316' : '#222'} strokeWidth={1}
              strokeDasharray="3 3" className={running ? 'flow-line-animated' : ''} style={{ '--flow-speed': '1.5s' }} />
          </g>
        )
      })}

      {/* Suction header */}
      <line x1="80" y1="165" x2="320" y2="165" stroke="#f97316" strokeWidth={3} opacity={0.3} />

      {/* WellLogic box (only on right side) */}
      {showWellLogic && (
        <g>
          <rect x={150} y={180} width={100} height={25} rx={4} fill="#0a0a16" stroke="#E8200C" strokeWidth={1.5} />
          <text x={200} y={195} textAnchor="middle" fill="#E8200C" fontSize="8" fontWeight="bold">WellLogic™</text>
          {/* Control lines to chokes */}
          <line x1={200} y1={180} x2={200} y2={170} stroke="#E8200C" strokeWidth={0.5} strokeDasharray="2 2" />
        </g>
      )}
    </svg>
  )
}
