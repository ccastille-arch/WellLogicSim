import { useState, useEffect, useRef } from 'react'

const CLIPS = [
  {
    id: 'well-pad-optimizer',
    title: 'Well Logic TM Well Panel - Well Pad Optimizer',
    duration: '2:30',
    description: 'From reactive control to coordinated optimization. See why the Well Logic Well Panel is not just a choke controller - it is a Well Pad Optimizer.',
    featured: true,
  },
  {
    id: 'what-is-welllogic',
    title: 'Well Logic TM - What It Does On Your Pad',
    duration: '45 sec',
    description: 'Your pad, your equipment, your gas. See how Well Logic controls every choke, reads every meter, and keeps your top wells producing - automatically.',
  },
  {
    id: 'trip-sidebyside',
    title: 'Compressor Trip - Your Pad vs a Well Logic Pad',
    duration: '40 sec',
    description: 'Same compressor trips on two identical pads at the same time. One has Well Logic, one does not. Watch what happens to your production.',
  },
]

export default function AnimatedClips() {
  const [playing, setPlaying] = useState(null)
  const [customAudio, setCustomAudio] = useState({})

  useEffect(() => {
    return () => {
      Object.values(customAudio).forEach(audio => {
        if (audio?.url) URL.revokeObjectURL(audio.url)
      })
    }
  }, [customAudio])

  const handleAudioUpload = (clipId, event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCustomAudio(prev => {
      if (prev[clipId]?.url) {
        URL.revokeObjectURL(prev[clipId].url)
      }

      return {
        ...prev,
        [clipId]: {
          name: file.name,
          url: URL.createObjectURL(file),
        },
      }
    })
  }

  const stopPlaying = () => {
    setPlaying(null)
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1200px] mx-auto">
      <h2 className="text-lg text-white font-bold mb-1" style={{ fontFamily: "'Montserrat'" }}>Product Videos</h2>
      <p className="text-[12px] text-[#888] mb-6">Animated demonstrations showing Well Logic in action.</p>

      <div className="space-y-6">
        {CLIPS.map(clip => (
          <div key={clip.id} className={`bg-[#0F3C64] rounded-xl overflow-hidden border-2 ${clip.featured ? 'border-[#D32028]/50' : 'border-[#222]'}`}>
            {clip.featured && (
              <div className="bg-[#D32028] px-4 py-1.5 flex items-center gap-2">
                <span className="text-white text-[10px] font-bold tracking-widest uppercase">Featured - New Release</span>
                <span className="text-white/60 text-[9px] ml-auto">{clip.duration}</span>
              </div>
            )}
            {/* Video area â€” 16:9 */}
            <div className="relative bg-[#060610] overflow-hidden" style={{ aspectRatio: '16/9' }}>
              {playing === clip.id ? (
                <div className="w-full h-full relative">
                  <ClipPlayer id={clip.id} audioUrl={customAudio[clip.id]?.url} onEnd={stopPlaying} />
                  <button onClick={stopPlaying}
                    className="absolute top-3 right-3 bg-[#111]/80 border border-[#444] rounded px-3 py-1 text-[10px] text-[#ccc] hover:text-white hover:bg-[#D32028] z-10">
                    Stop
                  </button>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center"
                  style={{ background: clip.featured ? 'radial-gradient(ellipse at center, #1a0a0a 0%, #060610 70%)' : undefined }}>
                  <div className="text-[12px] text-[#888] mb-4 px-8 text-center">{clip.title}</div>
                  <button onClick={() => setPlaying(clip.id)}
                    className={`rounded-full border-2 flex items-center justify-center hover:bg-[#D32028] transition-colors group ${clip.featured ? 'w-24 h-24 bg-[#D32028]/30 border-[#D32028]' : 'w-16 h-16 bg-[#D32028]/20 border-[#D32028]'}`}>
                    <span className={`text-[#D32028] group-hover:text-white ml-1 ${clip.featured ? 'text-4xl' : 'text-2xl'}`}>PLAY</span>
                  </button>
                  <span className="text-[10px] text-[#555] mt-3">{clip.duration}</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className={`text-white font-bold ${clip.featured ? 'text-[16px]' : 'text-[13px]'}`}>{clip.title}</h3>
              <p className="text-[11px] text-[#888] mt-1">{clip.description}</p>
              <div className="mt-3 pt-3 border-t border-[#293C5B]">
                <label className="block text-[9px] text-[#666] font-bold uppercase tracking-[0.2em] mb-2">
                  Clip Audio Upload
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(event) => handleAudioUpload(clip.id, event)}
                  className="block w-full text-[10px] text-[#aaa] file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#D32028] file:text-white file:font-bold hover:file:bg-[#B01A20]"
                />
                {customAudio[clip.id] ? (
                  <div className="mt-2">
                    <div className="text-[10px] text-[#22c55e] font-bold mb-1">Loaded: {customAudio[clip.id].name}</div>
                    <audio controls src={customAudio[clip.id].url} className="w-full" />
                  </div>
                ) : (
                  <div className="text-[10px] text-[#555] mt-2">No generated voice will be used. The clip will run silently until you upload narration.</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// NARRATION ENGINE â€” OpenAI TTS via server proxy
// Falls back to browser TTS if server returns error (e.g. key not set)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const DEFAULT_SILENT_FRAME_MS = 3500

let currentAudio = null

function speak(_text, onDone) {
  setTimeout(() => onDone?.(), DEFAULT_SILENT_FRAME_MS)
}

function stopSpeaking() {
  if (!currentAudio) return
  currentAudio.pause()
  currentAudio.currentTime = 0
  currentAudio = null
}

// Narration scripts
const NARRATION = {
  'well-pad-optimizer': [
    'For decades... oilfield control systems have been good enough.',
    'But good enough comes at a cost.',
    'Surging systems. Inefficient flow. Constant correction.',
    'Most sites operate like a relay race - each component reacting, then handing off. Never truly working together.',
    'What if the system did not just react... but coordinated?',
    'The Well Logic Well Panel is not a choke controller.',
    'It is a Well Pad Optimizer.',
    'It communicates across the entire pad.',
    'Every component understands what is happening before... and after it.',
    'Instead of reacting... each system adjusts in real time... as part of a unified strategy.',
    'Traditional logic chases conditions.',
    'The Well Panel maintains them.',
    'No surging. No unnecessary recycle. No wasted energy.',
    'Just controlled... continuous... optimized flow.',
    'This is not incremental improvement.',
    'This is the next generation of oilfield control.',
    'Well Logic. Well Pad Optimizer. Engineered for Uptime.',
  ],
  'what-is-welllogic': [
    'Here is your pad. Four wells on gas lift, two compressors, recirculated gas off the scrubber.',
    'Gas comes off the vertical scrubber, hits the suction header, feeds your compressors.',
    'Compressors push it through the discharge header. From there it splits to each well.',
    'Every well has a motor valve choke and a flow meter on the injection line. That is what Well Logic controls.',
    'Well Logic reads every flow meter, every pressure transmitter, every compressor status. All real time. All Modbus.',
    'It sets your choke positions automatically. No pumper driving out. No manual adjustments.',
    'Suction pressure drops? Well Logic adjusts compressor staging. Discharge spikes? It backs off before you trip.',
    'Your number one well always gets gas first. Period. Well Logic enforces priority across every choke on the pad.',
    'Well slugs out and scrubber pressure spikes? Sales valve opens. Compressors stay running. No pad shutdown.',
    'Demand changes? Well Logic stages compressors up or down. No wasted fuel, no starved wells.',
    'This runs twenty four seven. Nights, weekends, holidays. Same response at two A M as two P M.',
    'Well Logic by Service Compression. Your pad, optimized. All the time.',
  ],
  'trip-sidebyside': [
    'Two identical pads. Same wells, same compressors, same gas. One has Well Logic. One does not.',
    'C 1 trips. High discharge temp. Both pads lose half their compression at the same time. Right now.',
    'Every well on both pads just lost injection pressure. Production is falling. Barrels are being lost.',
    'Left side, your SCADA fires an alarm. Dispatcher calls the pumper. He is forty five minutes out. Right side, Well Logic already knows.',
    'Left side, pumper is still driving. Every well still starving. Right side, Well Logic is closing chokes on the low priority wells, pushing all available gas to your top producers.',
    'Left pad is still losing barrels across all four wells. Right pad, wells one and two are back at full target injection. Your best producers are protected.',
    'Pumper finally shows up on the left pad. Starts looking at the unit. Right pad has been stable for thirty plus minutes. Your top wells never stopped producing.',
    'Left side, pumper calls the mechanic. Waits an hour. Right side, Well Logic has been running at full optimization this entire time. Zero intervention.',
    'Mechanic fixes the unit. Now the pumper has to drive back out and reset every choke by hand. That is another trip, another hour. With Well Logic, that trip never happens. It is already done.',
  ],
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// VIDEO PLAYER â€” drives frame-by-frame animation + narration
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function ClipPlayer({ id, audioUrl, onEnd }) {
  const [frame, setFrame] = useState(-1) // -1 = not started yet
  const [tick, setTick] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const intervalRef = useRef(null)
  const audioRef = useRef(null)
  const frameTimeoutRef = useRef(null)
  const frameRef = useRef(-1)

  const narrationLines = NARRATION[id] || []
  const totalFrames = narrationLines.length

  useEffect(() => {
    if (!audioUrl) return undefined

    const audio = new Audio(audioUrl)
    audioRef.current = audio
    currentAudio = audio
    audio.play().catch(() => {})

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current = null
      }
      currentAudio = null
    }
  }, [audioUrl])

  useEffect(() => {
    const startTimer = setTimeout(() => advanceFrame(0), 500)
    return () => {
      clearTimeout(startTimer)
      stopSpeaking()
      if (frameTimeoutRef.current) clearTimeout(frameTimeoutRef.current)
    }
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
      // Quick pause between frames â€” keep it moving
      frameTimeoutRef.current = setTimeout(() => advanceFrame(frameRef.current + 1), 400)
    })
  }

  const displayFrame = Math.max(0, frame)

  if (id === 'well-pad-optimizer') return <WellPadOptimizerVideo frame={displayFrame} tick={tick} />
  if (id === 'what-is-welllogic') return <WhatIsWellLogicVideo frame={displayFrame} tick={tick} />
  if (id === 'trip-sidebyside') return <TripSideBySideVideo frame={displayFrame} tick={tick} />
  return null
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// VIDEO 1: What is Well Logic?
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function WhatIsWellLogicVideo({ frame, tick }) {
  const narration = [
    'This is a gas lift injection pad in West Texas.',
    'Wells produce oil and gas. The gas is separated and recirculated.',
    'Compressors push gas through a discharge header to each well.',
    'Each well has an injection choke valve controlling how much gas it receives.',
    'Flow meters measure the actual injection rate on every well.',
    'Well Logic sits at the center - controlling every choke valve in real time.',
    'It monitors suction pressure, discharge pressure, and every compressor.',
    'When conditions change, Well Logic reacts in seconds - not hours.',
    'It prioritizes your highest-value wells automatically.',
    'It detects well unloads and prevents shutdowns.',
    'It stages compressors based on demand - no wasted fuel.',
    'Well Logic - 24/7 automatic gas lift optimization.',
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
          <text x="400" y="16" textAnchor="middle" fill="#333" fontSize="9" fontWeight="bold" letterSpacing="3">SITE OVERVIEW - PAD OPTIMIZATION</text>

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

          {/* Well Logic box â€” center highlight */}
          <rect x={330} y={310} width={140} height={35} rx={6} fill="#0a0a16"
            stroke={highlightWellLogic || highlightAll ? '#D32028' : '#333'}
            strokeWidth={highlightWellLogic || highlightAll ? 2.5 : 1} />
          {(highlightWellLogic || highlightAll) && <rect x={330} y={310} width={140} height={35} rx={6} fill="#D32028" opacity={0.1} />}
          <text x={400} y={326} textAnchor="middle" fill="#D32028" fontSize="10" fontWeight="bold">Well Logic TM</text>
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
      <div className="bg-[#0c0c18] px-6 py-3 text-center border-t border-[#293C5B]">
        <p className="text-[14px] text-white font-medium">{caption}</p>
      </div>
    </div>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// VIDEO 2: Compressor Trip â€” Side by Side
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function TripSideBySideVideo({ frame, tick }) {
  const narration = [
    'Both pads are running normally. 4 wells, 2 compressors, full injection.',
    'COMPRESSOR C1 TRIPS - both pads lose a compressor at the same time.',
    'All wells immediately lose injection pressure on both pads.',
    'LEFT: Manual pad - SCADA alarm fires. Dispatching operator. RIGHT: Well Logic detecting shortfall.',
    'LEFT: Operator driving to pad (45 min). Production still down. RIGHT: Well Logic rebalancing chokes.',
    'LEFT: Still waiting. All wells suffering. RIGHT: Priority wells W1 and W2 back at target.',
    'LEFT: Operator arrives. Starts diagnosing. RIGHT: Well Logic stable. Top wells producing.',
    'LEFT: Calls mechanic. Waits 60 min. RIGHT: Well Logic been stable for over an hour already.',
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
            <span className="bg-[#D32028]/20 text-[#D32028] px-3 py-1 rounded text-[10px] font-bold">WITHOUT PAD LOGIC - MANUAL</span>
          </div>
          <MiniPad wells={manualWells} c1Status={manualC1} c2Status="running" showWellLogic={false} />
          {frame >= 3 && frame < 8 && (
            <div className="absolute bottom-8 left-4 right-4 bg-[#1a0808] rounded p-2 border border-[#D32028]/30">
              <div className="text-[9px] text-[#D32028]">
                {frame < 5 ? 'Operator driving to pad...' : frame < 7 ? 'Diagnosing / waiting for mechanic...' : 'Mechanic fixing / operator returning to readjust chokes...'}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Well Logic */}
        <div className="flex-1 relative">
          <div className="absolute top-2 left-0 right-0 text-center">
            <span className="bg-[#22c55e]/20 text-[#22c55e] px-3 py-1 rounded text-[10px] font-bold">WITH PAD LOGIC - AUTOMATIC</span>
          </div>
          <MiniPad wells={wlWells} c1Status={wlC1} c2Status="running" showWellLogic={true} />
          {frame >= 3 && (
            <div className="absolute bottom-8 left-4 right-4 bg-[#081a08] rounded p-2 border border-[#22c55e]/30">
              <div className="text-[9px] text-[#22c55e]">
                {frame < 4 ? 'Well Logic rebalancing chokes by priority...' : 'Priority wells at target. No operator needed.'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Caption */}
      <div className="bg-[#0c0c18] px-6 py-3 text-center border-t border-[#293C5B]">
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
        const color = pct > 90 ? '#22c55e' : pct > 50 ? '#eab308' : pct > 10 ? '#D32028' : '#333'
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
        const color = running ? '#22c55e' : '#D32028'
        return (
          <g key={i}>
            <line x1={c.x+25} y1={90} x2={c.x+25} y2={110} stroke={running ? '#22c55e' : '#222'} strokeWidth={1.5}
              strokeDasharray="3 3" className={running ? 'flow-line-animated' : ''} style={{ '--flow-speed': '1.5s' }} />
            <rect x={c.x} y={110} width={50} height={35} rx={3} fill="#0a0a16" stroke={color} strokeWidth={1.5} />
            {!running && <rect x={c.x} y={110} width={50} height={35} rx={3} fill="#D32028" opacity={0.15} />}
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

      {/* Well Logic box (only on right side) */}
      {showWellLogic && (
        <g>
          <rect x={150} y={180} width={100} height={25} rx={4} fill="#0a0a16" stroke="#D32028" strokeWidth={1.5} />
          <text x={200} y={195} textAnchor="middle" fill="#D32028" fontSize="8" fontWeight="bold">Well Logic TM</text>
          <line x1={200} y1={180} x2={200} y2={170} stroke="#D32028" strokeWidth={0.5} strokeDasharray="2 2" />
        </g>
      )}
    </svg>
  )
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// VIDEO 3: Well Logicâ„¢ Well Pad Optimizer â€” Cinematic
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function WellPadOptimizerVideo({ frame, tick }) {

  // Scene selector
  const scene =
    frame <= 1  ? 'open' :
    frame <= 3  ? 'problem' :
    frame === 4 ? 'shift' :
    frame <= 6  ? 'solution' :
    frame <= 9  ? 'core' :
    frame <= 11 ? 'contrast' :
    frame <= 13 ? 'impact' :
    frame <= 15 ? 'close' :
                  'endframe'

  const caption = [
    'For decades... oilfield control systems have been good enough.',
    'But good enough comes at a cost.',
    'Surging systems. Inefficient flow. Constant correction.',
    'Most sites operate like a relay race - each component reacting, then handing off. Never truly working together.',
    'What if the system did not just react... but coordinated?',
    'The Well Logic Well Panel is not a choke controller.',
    'It is a Well Pad Optimizer.',
    'It communicates across the entire pad.',
    'Every component understands what is happening before... and after it.',
    'Instead of reacting... each system adjusts in real time... as part of a unified strategy.',
    'Traditional logic chases conditions.',
    'The Well Panel maintains them.',
    'No surging. No unnecessary recycle. No wasted energy.',
    'Just controlled... continuous... optimized flow.',
    'This is not incremental improvement.',
    'This is the next generation of oilfield control.',
    '',
  ][Math.min(frame, 16)]

  const blink = Math.floor(tick / 2) % 2 === 0

  return (
    <div className="w-full h-full flex flex-col bg-black relative">
      {/* Cinematic letterbox top */}
      <div className="h-[6%] bg-black shrink-0" />

      {/* Main scene */}
      <div className="flex-1 relative overflow-hidden">
        <svg viewBox="0 0 800 320" className="w-full h-full" preserveAspectRatio="xMidYMid meet" style={{ fontFamily: 'Arial, sans-serif' }}>

          {/* â”€â”€ OPEN: West Texas establishing shot â”€â”€ */}
          {scene === 'open' && <>
            {/* Sky gradient */}
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b8822a" />
                <stop offset="55%" stopColor="#d4a855" />
                <stop offset="100%" stopColor="#c8b080" />
              </linearGradient>
              <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b8a882" />
                <stop offset="100%" stopColor="#9a9070" />
              </linearGradient>
            </defs>
            <rect width="800" height="320" fill="url(#sky)" />
            <rect y="195" width="800" height="125" fill="url(#ground)" />
            {/* Caliche road */}
            <polygon points="340,320 460,320 430,195 370,195" fill="#d4c8a0" opacity="0.6" />
            {/* Dust haze */}
            <rect width="800" height="320" fill="#d4a855" opacity="0.08" />
            {/* Sun */}
            <circle cx="680" cy="60" r="28" fill="#fff8e0" opacity="0.9" />
            <circle cx="680" cy="60" r="38" fill="#ffe090" opacity="0.25" />
            {/* Sun glare rays */}
            {[0,45,90,135,180,225,270,315].map(a => (
              <line key={a} x1={680+38*Math.cos(a*Math.PI/180)} y1={60+38*Math.sin(a*Math.PI/180)}
                x2={680+55*Math.cos(a*Math.PI/180)} y2={60+55*Math.sin(a*Math.PI/180)}
                stroke="#ffe090" strokeWidth="1.5" opacity="0.3" />
            ))}
            {/* Horizon pump jack silhouette (left) */}
            <rect x="60" y="155" width="6" height="45" fill="#3a3020" />
            <rect x="50" y="148" width="26" height="8" rx="2" fill="#3a3020" />
            <rect x="56" y="138" width="4" height="12" fill="#3a3020" />
            <ellipse cx="63" cy="137" rx="10" ry="6" fill="#3a3020" />
            {/* Pump jack 2 */}
            <rect x="120" y="165" width="5" height="35" fill="#3a3020" />
            <ellipse cx="122" cy="164" rx="8" ry="5" fill="#3a3020" />
            {/* Compressor package silhouette */}
            <rect x="420" y="170" width="80" height="30" rx="3" fill="#2a2418" />
            <rect x="430" y="162" width="60" height="12" rx="2" fill="#2a2418" />
            <rect x="444" y="155" width="8" height="9" fill="#2a2418" />
            <rect x="458" y="155" width="8" height="9" fill="#2a2418" />
            {/* Wellhead silhouettes */}
            {[200,260,320,380].map(x => (
              <g key={x}>
                <rect x={x} y="175" width="14" height="20" fill="#2a2418" />
                <rect x={x-3} y="172" width="20" height="5" fill="#2a2418" />
                <rect x={x+4} y="166" width="6" height="8" fill="#2a2418" />
              </g>
            ))}
            {/* Separator vessel */}
            <ellipse cx="570" cy="185" rx="8" ry="16" fill="#2a2418" />
            <rect x="562" y="172" width="60" height="26" rx="4" fill="#2a2418" />
            <ellipse cx="622" cy="185" rx="8" ry="16" fill="#2a2418" />
            {/* Piping */}
            <line x1="200" y1="185" x2="570" y2="185" stroke="#2a2418" strokeWidth="3" />
            {/* Title overlay */}
            <text x="400" y="100" textAnchor="middle" fill="white" fontSize="22" fontWeight="900"
              fontFamily="'Montserrat', sans-serif" fontStyle="italic" opacity={frame === 0 ? 0.9 : 0.4}>
              Well Logic TM
            </text>
            <text x="400" y="124" textAnchor="middle" fill="white" fontSize="13" fontWeight="700"
              fontFamily="'Montserrat', sans-serif" letterSpacing="4" opacity={frame === 0 ? 0.7 : 0.3}>
              WEST TEXAS
            </text>
          </>}

          {/* â”€â”€ PROBLEM: Reactive / chaotic pad â”€â”€ */}
          {scene === 'problem' && <>
            <rect width="800" height="320" fill="#05233E" />
            <text x="400" y="22" textAnchor="middle" fill="#555" fontSize="8" letterSpacing="3">PAD STATUS - UNMANAGED</text>
            {/* 4 wells with erratic readings */}
            {[0,1,2,3].map(i => {
              const x = 80 + i * 170
              const erratic = frame >= 2
              const val = erratic ? [42,18,67,31][i] : [85,82,80,78][i]
              const sp = [100,100,100,100][i]
              const color = val > 70 ? '#eab308' : '#D32028'
              const pressure = erratic ? [310+i*20,180-i*15,420+i*10,260-i*8][i] : [350,350,350,350][i]
              return (
                <g key={i}>
                  {/* Wellhead */}
                  <rect x={x+5} y="45" width="20" height="28" fill="#293C5B" stroke="#444" strokeWidth="1" />
                  <rect x={x+2} y="40" width="26" height="8" rx="1" fill="#293C5B" stroke="#444" strokeWidth="1" />
                  <rect x={x+10} y="33" width="10" height="9" fill="#293C5B" stroke="#444" strokeWidth="1" />
                  <rect x={x+12} y="73" width="6" height="18" fill="#444" />
                  {/* Choke valve */}
                  <polygon points={`${x+13},96 ${x+17},91 ${x+21},96 ${x+17},101`} fill={color} />
                  {/* Flow meter circle */}
                  <circle cx={x+17} cy="114" r="7" fill="#03172A" stroke={color} strokeWidth="1.5" />
                  <text x={x+17} y="117" textAnchor="middle" fill={color} fontSize="5" fontWeight="bold">FM</text>
                  {/* Inject line */}
                  <line x1={x+17} y1="121" x2={x+17} y2="155" stroke={erratic ? '#D32028' : '#22c55e'}
                    strokeWidth="1.5" strokeDasharray="4 3" />
                  {/* Reading */}
                  <text x={x+17} y="85" textAnchor="middle" fill={color} fontSize="9" fontWeight="bold">{val}%</text>
                  <text x={x+17} y="30" textAnchor="middle" fill="#888" fontSize="8">W{i+1}</text>
                  {/* Pressure gauge */}
                  <rect x={x} y="165" width="34" height="22" rx="2" fill="#03172A" stroke="#333" strokeWidth="1" />
                  <text x={x+17} y="175" textAnchor="middle" fill={erratic ? '#D32028' : '#eab308'} fontSize="8" fontWeight="bold">{pressure}</text>
                  <text x={x+17} y="183" textAnchor="middle" fill="#666" fontSize="6">PSI</text>
                  {erratic && blink && <rect x={x} y="165" width="34" height="22" rx="2" fill="#D32028" opacity="0.15" />}
                </g>
              )
            })}
            {/* Discharge header â€” wavy/chaotic */}
            <path d={`M 60 155 Q 160 ${frame>=2?148:155} 260 155 Q 360 ${frame>=2?162:155} 460 155 Q 560 ${frame>=2?149:155} 660 155`}
              stroke={frame>=2 ? '#D32028' : '#22c55e'} strokeWidth="3" fill="none" opacity="0.4" />
            <text x="50" y="153" textAnchor="end" fill="#D32028" fontSize="7" fontWeight="bold">DISCH</text>
            {/* Compressors */}
            {[0,1].map(i => {
              const x = 190 + i * 280
              return (
                <g key={i}>
                  <rect x={x} y="210" width="70" height="50" rx="3" fill="#03172A" stroke="#D32028" strokeWidth="1.5" />
                  {blink && frame>=2 && <rect x={x} y="210" width="70" height="50" rx="3" fill="#D32028" opacity="0.1" />}
                  <text x={x+35} y="230" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">C{i+1}</text>
                  <text x={x+35} y="244" textAnchor="middle" fill="#D32028" fontSize="7">{frame>=2 ? 'SURGING' : 'RUN'}</text>
                  <text x={x+35} y="255" textAnchor="middle" fill="#888" fontSize="6">Load {frame>=2 ? (95-i*8)+'%' : '75%'}</text>
                </g>
              )
            })}
            {/* SCADA alarm strip */}
            {frame >= 2 && (
              <rect x="0" y="278" width="800" height="20" fill="#1a0808" />
            )}
            {frame >= 2 && blink && (
              <text x="400" y="292" textAnchor="middle" fill="#D32028" fontSize="9" fontWeight="bold" letterSpacing="2">
                SURGE DETECTED - W2 BELOW SETPOINT - DISCHARGE HIGH - MANUAL INTERVENTION REQUIRED
              </text>
            )}
          </>}

          {/* â”€â”€ SHIFT: Minimalist question â”€â”€ */}
          {scene === 'shift' && <>
            <rect width="800" height="320" fill="#050508" />
            <line x1="200" y1="160" x2="600" y2="160" stroke="#D32028" strokeWidth="0.5" opacity="0.3" />
            <text x="400" y="148" textAnchor="middle" fill="#888" fontSize="13" letterSpacing="2"
              fontFamily="'Georgia', serif" fontStyle="italic">
              What if the system did not react...
            </text>
            <text x="400" y="178" textAnchor="middle" fill="white" fontSize="15" fontWeight="700"
              fontFamily="'Montserrat', sans-serif" letterSpacing="2">
              but coordinated?
            </text>
          </>}

          {/* â”€â”€ SOLUTION: Well Logic panel close-up â”€â”€ */}
          {scene === 'solution' && <>
            <rect width="800" height="320" fill="#0a0a10" />
            {/* Panel enclosure */}
            <rect x="250" y="40" width="300" height="220" rx="6" fill="#141420" stroke="#333" strokeWidth="2" />
            <rect x="258" y="48" width="284" height="204" rx="4" fill="#0c0c18" stroke="#222" strokeWidth="1" />
            {/* Panel nameplate */}
            <rect x="300" y="55" width="200" height="24" rx="2" fill="#1a1a28" stroke="#333" strokeWidth="1" />
            <text x="400" y="71" textAnchor="middle" fill="#D32028" fontSize="10" fontWeight="bold"
              fontFamily="'Montserrat', sans-serif" fontStyle="italic">Well Logic TM</text>
            {/* Screen */}
            <rect x="270" y="88" width="170" height="100" rx="3" fill="#060612" stroke="#444" strokeWidth="1" />
            {/* SCADA display on screen */}
            <text x="355" y="102" textAnchor="middle" fill="#22c55e" fontSize="7" letterSpacing="1">PAD STATUS - OPTIMIZED</text>
            {[0,1,2,3].map(i => (
              <g key={i}>
                <text x="280" y={118+i*18} fill="#888" fontSize="7">W{i+1}</text>
                <rect x="298" y={109+i*18} width="70" height="6" rx="1" fill="#111" />
                <rect x="298" y={109+i*18} width={[68,62,65,60][i]} height="6" rx="1" fill="#22c55e" />
                <text x="375" y={117+i*18} fill="#22c55e" fontSize="7">{[97,89,93,87][i]}%</text>
              </g>
            ))}
            {/* Controls right side */}
            <rect x="452" y="88" width="78" height="100" rx="3" fill="#060612" stroke="#444" strokeWidth="1" />
            {[0,1,2].map(i => (
              <g key={i}>
                <circle cx="470" cy={105+i*28} r="8" fill="#111" stroke="#333" strokeWidth="1" />
                <text x="470" cy={109+i*28} textAnchor="middle" fill="#888" fontSize="5">ADJ</text>
                <rect x="485" y={98+i*28} width="35" height="10" rx="1" fill="#03172A" stroke="#333" strokeWidth="1" />
                <text x="502" y={106+i*28} textAnchor="middle" fill="#22c55e" fontSize="6">
                  {['AUTO','OPT','RUN'][i]}
                </text>
              </g>
            ))}
            {/* Status lights */}
            {[0,1,2,3].map(i => (
              <circle key={i} cx={280+i*20} cy="205" r="5" fill="#22c55e" opacity={blink && i===1 ? 0.4 : 0.9} />
            ))}
            <text x="400" y="220" textAnchor="middle" fill="#444" fontSize="6" letterSpacing="2">PAD LOGIC CONTROL SYSTEM</text>
            {/* Label */}
            <text x="400" y="275" textAnchor="middle" fill={frame===6 ? 'white' : '#888'} fontSize={frame===6 ? 16 : 11}
              fontWeight="900" fontFamily="'Montserrat', sans-serif" letterSpacing="3">
              {frame === 5 ? 'NOT A CHOKE CONTROLLER.' : 'A WELL PAD OPTIMIZER.'}
            </text>
          </>}

          {/* â”€â”€ CORE: Communication network across pad â”€â”€ */}
          {scene === 'core' && <>
            <rect width="800" height="320" fill="#05233E" />
            <text x="400" y="20" textAnchor="middle" fill="#333" fontSize="8" letterSpacing="3">UNIFIED PAD COMMUNICATION</text>
            {/* Central intelligence hub */}
            <rect x="325" y="135" width="150" height="50" rx="8" fill="#0f0f1e" stroke="#D32028" strokeWidth="2" />
            <rect x="325" y="135" width="150" height="50" rx="8" fill="#D32028" opacity="0.07" />
            <text x="400" y="157" textAnchor="middle" fill="#D32028" fontSize="11" fontWeight="bold"
              fontFamily="'Montserrat', sans-serif" fontStyle="italic">Well Logic TM</text>
            <text x="400" y="173" textAnchor="middle" fill="#888" fontSize="7" letterSpacing="2">WELL PAD OPTIMIZER</text>
            {/* Connected nodes â€” wells */}
            {[0,1,2,3].map(i => {
              const wx = 70 + i*60, wy = 40
              const active = frame >= 7
              return (
                <g key={i}>
                  <line x1={wx+15} y1={wy+35} x2="400" y2="160"
                    stroke={active ? '#22c55e' : '#293C5B'} strokeWidth={active ? 1.5 : 0.5}
                    strokeDasharray={active ? '5 3' : '3 5'} opacity={active ? 0.7 : 0.3} />
                  <rect x={wx} y={wy} width="30" height="35" rx="3" fill="#03172A" stroke={active ? '#22c55e' : '#333'} strokeWidth="1.5" />
                  <text x={wx+15} y={wy+14} textAnchor="middle" fill="#888" fontSize="7">W{i+1}</text>
                  <text x={wx+15} y={wy+26} textAnchor="middle" fill={active ? '#22c55e' : '#555'} fontSize="6">INJECT</text>
                  {active && <text x={wx+15} y={wy+35} textAnchor="middle" fill="#22c55e" fontSize="5">LIVE</text>}
                </g>
              )
            })}
            {/* Compressors */}
            {[0,1].map(i => {
              const cx2 = 140 + i*480, cy2 = 250
              const active = frame >= 7
              return (
                <g key={i}>
                  <line x1={cx2+35} y1={cy2} x2="400" y2="185"
                    stroke={active ? '#f97316' : '#293C5B'} strokeWidth={active ? 1.5 : 0.5}
                    strokeDasharray={active ? '5 3' : '3 5'} opacity={active ? 0.7 : 0.3} />
                  <rect x={cx2} y={cy2} width="70" height="40" rx="4" fill="#03172A" stroke={active ? '#f97316' : '#333'} strokeWidth="1.5" />
                  <text x={cx2+35} y={cy2+16} textAnchor="middle" fill="#888" fontSize="8">C{i+1}</text>
                  <text x={cx2+35} y={cy2+28} textAnchor="middle" fill={active ? '#f97316' : '#555'} fontSize="6">
                    {active ? 'COORDINATED' : 'STANDALONE'}
                  </text>
                </g>
              )
            })}
            {/* Separator */}
            <line x1="570" y1="175" x2="475" y2="160"
              stroke={frame>=8 ? '#4fc3f7' : '#293C5B'} strokeWidth={frame>=8 ? 1.5 : 0.5}
              strokeDasharray="5 3" opacity={frame>=8 ? 0.7 : 0.3} />
            <rect x="560" y="155" width="70" height="35" rx="4" fill="#03172A" stroke={frame>=8 ? '#4fc3f7' : '#333'} strokeWidth="1.5" />
            <text x="595" y="170" textAnchor="middle" fill="#888" fontSize="7">SEPARATOR</text>
            <text x="595" y="182" textAnchor="middle" fill={frame>=8 ? '#4fc3f7' : '#555'} fontSize="6">
              {frame>=8 ? 'AWARE' : 'ISOLATED'}
            </text>
            {/* Annotation */}
            {frame >= 9 && (
              <text x="400" y="310" textAnchor="middle" fill="#22c55e" fontSize="9" letterSpacing="1">
                Unified Strategy - Every Component In Sync
              </text>
            )}
          </>}

          {/* â”€â”€ CONTRAST: Chase vs. Maintain â”€â”€ */}
          {scene === 'contrast' && <>
            <rect width="800" height="320" fill="#05233E" />
            {/* Divider */}
            <line x1="400" y1="0" x2="400" y2="320" stroke="#333" strokeWidth="1" />
            {/* LEFT: Traditional â€” chasing */}
            <text x="200" y="25" textAnchor="middle" fill="#D32028" fontSize="9" fontWeight="bold" letterSpacing="2">TRADITIONAL LOGIC</text>
            {/* Jagged pressure trace */}
            <polyline points={`40,80 80,${110+Math.sin(tick)*8} 120,65 160,${95+Math.cos(tick)*10} 200,75 240,${105+Math.sin(tick+1)*7} 280,62 320,${90+Math.cos(tick+2)*9} 360,80`}
              stroke="#D32028" strokeWidth="2" fill="none" opacity="0.8" />
            <text x="200" y="130" textAnchor="middle" fill="#D32028" fontSize="8">CHASING CONDITIONS</text>
            {/* Setpoint line */}
            <line x1="40" y1="80" x2="360" y2="80" stroke="#888" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
            <text x="45" y="77" fill="#666" fontSize="6">SETPOINT</text>
            {/* Shows operator actions */}
            <text x="200" y="155" textAnchor="middle" fill="#555" fontSize="7">Valve adjusted, overshoots, readjust, repeats</text>
            {/* Choke positions erratic */}
            {[0,1,2,3].map(i => {
              const h = [55,30,70,40][i]
              return (
                <g key={i}>
                  <rect x={55+i*70} y={200} width="40" height="70" fill="#111" stroke="#333" strokeWidth="1" rx="2" />
                  <rect x={55+i*70} y={200+(70-h)} width="40" height={h} fill="#D32028" opacity="0.5" rx="2" />
                  <text x={75+i*70} y={215+70-h} textAnchor="middle" fill="#D32028" fontSize="6">{h}%</text>
                  <text x={75+i*70} y="283" textAnchor="middle" fill="#666" fontSize="6">W{i+1}</text>
                </g>
              )
            })}
            <text x="200" y="300" textAnchor="middle" fill="#D32028" fontSize="7">Uneven. Reactive. Wasteful.</text>

            {/* RIGHT: Well Logic â€” maintaining */}
            <text x="600" y="25" textAnchor="middle" fill="#22c55e" fontSize="9" fontWeight="bold" letterSpacing="2">PAD LOGIC WELL PANEL</text>
            {/* Smooth flat trace */}
            <polyline points="440,80 480,79 520,80 560,80 600,79 640,80 680,80 720,79 760,80"
              stroke="#22c55e" strokeWidth="2.5" fill="none" opacity="0.9" />
            <line x1="440" y1="80" x2="760" y2="80" stroke="#888" strokeWidth="1" strokeDasharray="4 3" opacity="0.4" />
            <text x="445" y="77" fill="#666" fontSize="6">SETPOINT</text>
            <text x="600" y="130" textAnchor="middle" fill="#22c55e" fontSize="8">MAINTAINING CONDITIONS</text>
            {/* Even choke positions */}
            {[0,1,2,3].map(i => {
              const h = [82,78,80,76][i]
              return (
                <g key={i}>
                  <rect x={455+i*70} y={200} width="40" height="70" fill="#111" stroke="#333" strokeWidth="1" rx="2" />
                  <rect x={455+i*70} y={200+(70-h)} width="40" height={h} fill="#22c55e" opacity="0.5" rx="2" />
                  <text x={475+i*70} y={215+70-h} textAnchor="middle" fill="#22c55e" fontSize="6">{h}%</text>
                  <text x={475+i*70} y="283" textAnchor="middle" fill="#666" fontSize="6">W{i+1}</text>
                </g>
              )
            })}
            <text x="600" y="300" textAnchor="middle" fill="#22c55e" fontSize="7">Balanced. Proactive. Efficient.</text>
          </>}

          {/* â”€â”€ IMPACT: Stable optimized pad â”€â”€ */}
          {scene === 'impact' && <>
            <rect width="800" height="320" fill="#060610" />
            <text x="400" y="20" textAnchor="middle" fill="#333" fontSize="8" letterSpacing="3">OPTIMIZED PAD - ALL SYSTEMS NOMINAL</text>
            {/* 4 wells all green */}
            {[0,1,2,3].map(i => {
              const x = 80 + i*170
              const val = [97,94,96,92][i]
              return (
                <g key={i}>
                  {/* Wellhead */}
                  <rect x={x+5} y="45" width="20" height="28" fill="#0a1a0a" stroke="#22c55e" strokeWidth="1.5" />
                  <rect x={x+2} y="40" width="26" height="8" rx="1" fill="#0a1a0a" stroke="#22c55e" strokeWidth="1" />
                  <rect x={x+10} y="33" width="10" height="9" fill="#0a1a0a" stroke="#22c55e" strokeWidth="1" />
                  <rect x={x+12} y="73" width="6" height="18" fill="#22c55e" opacity="0.5" />
                  {/* Choke â€” open, steady */}
                  <polygon points={`${x+13},96 ${x+17},91 ${x+21},96 ${x+17},101`} fill="#22c55e" />
                  <circle cx={x+17} cy="114" r="7" fill="#0a1a0a" stroke="#22c55e" strokeWidth="1.5" />
                  <text x={x+17} y="117" textAnchor="middle" fill="#22c55e" fontSize="5" fontWeight="bold">FM</text>
                  <line x1={x+17} y1="121" x2={x+17} y2="160" stroke="#22c55e" strokeWidth="2"
                    strokeDasharray="4 3" className="flow-line-animated" style={{ '--flow-speed': '1.2s' }} />
                  <text x={x+17} y="85" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="bold">{val}%</text>
                  <text x={x+17} y="30" textAnchor="middle" fill="#888" fontSize="8">W{i+1}</text>
                </g>
              )
            })}
            {/* Discharge header â€” smooth */}
            <line x1="60" y1="160" x2="740" y2="160" stroke="#22c55e" strokeWidth="4" opacity="0.3" />
            {/* Compressors â€” running steady */}
            {[0,1].map(i => {
              const x = 220 + i*280
              return (
                <g key={i}>
                  <line x1={x+35} y1="160" x2={x+35} y2="195" stroke="#22c55e" strokeWidth="2"
                    strokeDasharray="4 3" className="flow-line-animated" style={{ '--flow-speed': '1.2s' }} />
                  <rect x={x} y="195" width="70" height="48" rx="4" fill="#0a1a0a" stroke="#22c55e" strokeWidth="2" />
                  <circle cx={x+12} cy="210" r="4" fill="#22c55e" />
                  <text x={x+22} y="213" fill="white" fontSize="9" fontWeight="bold">C{i+1}</text>
                  <text x={x+65} y="213" textAnchor="end" fill="#22c55e" fontSize="6">RUN</text>
                  <text x={x+7} y="226" fill="#888" fontSize="6">Load 76%  Stable</text>
                  <text x={x+7} y="236" fill="#22c55e" fontSize="6">On setpoint</text>
                </g>
              )
            })}
            {/* Impact callouts */}
            {frame >= 13 && (
              <g>
                {[{x:120,t:'No Surging',c:'#22c55e'},{x:300,t:'No Recycle',c:'#22c55e'},{x:480,t:'No Waste',c:'#22c55e'},{x:650,t:'Max Flow',c:'#22c55e'}].map((item,i) => (
                  <g key={i}>
                    <text x={item.x} y="285" textAnchor="middle" fill={item.c} fontSize="9" fontWeight="bold">{item.t}</text>
                  </g>
                ))}
              </g>
            )}
          </>}

          {/* â”€â”€ CLOSE â”€â”€ */}
          {scene === 'close' && <>
            <rect width="800" height="320" fill="#050508" />
            <line x1="150" y1="160" x2="650" y2="160" stroke="#D32028" strokeWidth="0.5" opacity="0.2" />
            <text x="400" y="148" textAnchor="middle" fill="#888" fontSize="13"
              fontFamily="'Georgia', serif" fontStyle="italic" letterSpacing="1">
              {frame === 14 ? 'This is not incremental improvement.' : 'This is the next generation'}
            </text>
            {frame === 15 && (
              <text x="400" y="178" textAnchor="middle" fill="white" fontSize="13"
                fontFamily="'Georgia', serif" fontStyle="italic" letterSpacing="1">
                of oilfield control.
              </text>
            )}
          </>}

          {/* â”€â”€ END FRAME â”€â”€ */}
          {scene === 'endframe' && <>
            <rect width="800" height="320" fill="#050508" />
            {/* Red accent line */}
            <line x1="250" y1="175" x2="550" y2="175" stroke="#D32028" strokeWidth="2" />
            <text x="400" y="138" textAnchor="middle" fill="#D32028" fontSize="30" fontWeight="900"
              fontFamily="'Montserrat', sans-serif" fontStyle="italic" letterSpacing="2">Well Logic TM</text>
            <text x="400" y="163" textAnchor="middle" fill="white" fontSize="14" fontWeight="700"
              fontFamily="'Montserrat', sans-serif" letterSpacing="4">WELL PAD OPTIMIZER</text>
            <line x1="280" y1="178" x2="520" y2="178" stroke="#D32028" strokeWidth="1" opacity="0.4" />
            <text x="400" y="200" textAnchor="middle" fill="#888" fontSize="10" letterSpacing="4"
              fontFamily="'Georgia', serif" fontStyle="italic">Engineered for Uptime</text>
            <text x="400" y="230" textAnchor="middle" fill="#444" fontSize="7" letterSpacing="3">SERVICE COMPRESSION</text>
          </>}

        </svg>
      </div>

      {/* Cinematic letterbox bottom */}
      <div className="h-[6%] bg-black shrink-0" />

      {/* Caption â€” cinematic subtitle style */}
      {caption && (
        <div className="absolute bottom-[6%] left-0 right-0 text-center px-12 pointer-events-none">
          <span className="bg-black/70 text-white text-[13px] px-4 py-1.5 rounded font-medium"
            style={{ fontFamily: "'Georgia', serif", fontStyle: 'italic', letterSpacing: '0.3px' }}>
            {caption}
          </span>
        </div>
      )}
    </div>
  )
}


