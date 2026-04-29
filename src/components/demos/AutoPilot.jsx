import { useState, useEffect, useRef } from 'react'
import SiteOverview from '../SiteOverview'
import { getMetrics } from '../../engine/simulation'
import { WellLogicCompact } from '../WellLogicBrand'
import { useAuth } from '../auth/AuthProvider'

// AUTO-PILOT PRESENTATION MODE
// Runs the entire WellLogic demo automatically.
// Brad just stands there. The tool does everything.
// Narrates each step, triggers events, shows results, moves on.

const FORCE_ALL_RED_STEPS = new Set([3, 4]) // "Impact" and "Without Well Logic"
const DEFAULT_VOICEOVER_URL = '/audio/Customer_Demo_Audio_v2.0.mp3'
const API_BASE = import.meta.env.VITE_API_URL || ''

const SCRIPT = [
  // Each step: what to say (teleprompter), what to do (action), how long to wait
  {
    phase: 'intro',
    title: 'Welcome',
    say: "What you're looking at is a live simulation of a gas lift injection pad — the same equipment you're running today. Four wells, two compressors, injection chokes on every well.",
    presenterNote: 'Let them look at the diagram for a moment. Point out the wells at top, compressors at bottom.',
    action: null,
    duration: 15000,
  },
  {
    phase: 'intro',
    title: 'Normal Operations',
    say: "Right now everything is running perfectly. Every well is getting exactly the gas it needs. All compressors online. One hundred percent injection accuracy.",
    presenterNote: 'Point to the green metrics at bottom. All wells green, both compressors running.',
    action: null,
    duration: 11000,
  },
  {
    phase: 'trip',
    title: 'Compressor Trips',
    say: "Now watch what happens when a compressor goes down unexpectedly.",
    presenterNote: 'Pause for effect. Let them watch.',
    action: (sim) => sim.setCompressorStatus(0, 'tripped'),
    duration: 5000,
  },
  {
    phase: 'trip',
    title: 'Impact',
    say: "Every well on the pad just lost injection pressure. You can see them all going red. Production is dropping right now.",
    presenterNote: 'Point to wells turning yellow/red. Point to accuracy dropping.',
    action: null,
    duration: 10000,
  },
  {
    phase: 'trip',
    title: 'Without Well Logic',
    say: "Without Well Logic, this is where your pumper gets a call. Forty five minutes to drive out. Another hour to diagnose and wait on a mechanic. Then he has to drive back out again just to readjust the chokes. That's three to four hours of lost production across every well on your pad.",
    presenterNote: 'This is the pain point. Let it sink in.',
    action: null,
    duration: 25000,
  },
  {
    phase: 'trip',
    title: 'Well Logic Responds',
    say: "But watch what Well Logic does. It's already detected the shortfall. It's closing chokes on your lower priority wells and redirecting all available gas to your top producers.",
    presenterNote: 'Point to wells 1 and 2 recovering to green while 3 and 4 stay curtailed.',
    action: null,
    duration: 14000,
  },
  {
    phase: 'trip',
    title: 'Priority Wells Protected',
    say: "Your number one and number two wells are back at full target injection. Your best producers never stopped. That happened in under sixty seconds. No phone call. No truck roll. No choke adjustments.",
    presenterNote: 'Point to W1 and W2 green. Point to the time. This is the money shot.',
    action: null,
    duration: 15000,
  },
  {
    phase: 'restore',
    title: 'Restoring',
    say: "Now let's bring that compressor back online and look at another scenario.",
    presenterNote: '',
    action: (sim) => {
      sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
      sim.setTotalAvailableGas(sim.state.maxGasCapacity)
    },
    duration: 10000,
  },
  {
    phase: 'constrain',
    title: 'Gas Supply Drops',
    say: "What happens when your gas supply starts declining? Maybe your formation is depleting, maybe there's a pipeline restriction upstream.",
    presenterNote: '',
    action: (sim) => sim.setTotalAvailableGas(sim.state.maxGasCapacity * 0.5),
    duration: 12000,
  },
  {
    phase: 'constrain',
    title: 'Priority Enforcement',
    say: "Well Logic automatically protects your highest value wells. Your number one well gets every bit of gas it needs. The lower priority wells get what's left. You're not losing production equally across the board anymore — your best wells are always protected.",
    presenterNote: 'Point to W1 staying green, W3/W4 going red. This is prioritization.',
    action: null,
    duration: 22000,
  },
  {
    phase: 'restore2',
    title: 'Restoring',
    say: "Let me restore normal operations for the next scenario.",
    presenterNote: '',
    action: (sim) => {
      sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
      sim.setTotalAvailableGas(sim.state.maxGasCapacity)
    },
    duration: 8000,
  },
  {
    phase: 'unload',
    title: 'Well Unload Event',
    say: "Here's one that every production foreman has dealt with. A well slugs out. Gas slug hits your scrubber. Pressure spikes. Without automation, that can shut down your entire pad.",
    presenterNote: '',
    action: (sim) => {
      sim.setStateField('wellUnloadActive', true)
      // Ramp scrubber pressure from 100 to 130 over 3500ms
      const start = Date.now()
      const ramp = setInterval(() => {
        const t = Math.min(1, (Date.now() - start) / 3500)
        sim.setStateField('scrubberPressure', 100 + 30 * t)
        if (t >= 1) clearInterval(ramp)
      }, 100)
      setTimeout(() => sim.setStateField('wellUnloadActive', false), 6000)
    },
    duration: 14000,
  },
  {
    phase: 'unload',
    title: 'Well Logic Handles It',
    say: "Well Logic detected that pressure spike instantly. It opened the sales valve to relieve pressure and kept your compressors running. No shutdown. No lost production. No middle of the night phone call.",
    presenterNote: 'Point to sales valve opening, pressure stabilizing. Compressors still green.',
    action: (sim) => {
      // Open sales valve after pressure has built (3500ms ramp from previous slide)
      setTimeout(() => sim.setStateField('salesValvePosition', 85), 3500)
    },
    duration: 14000,
  },
  {
    phase: 'close',
    title: 'The Bottom Line',
    say: "This runs twenty four seven. Nights, weekends, holidays. The same response at two AM as two PM. Your best wells always get gas first. Your compressors stay running. Your pumpers aren't chasing alarms.",
    presenterNote: 'This is the close. Make eye contact. Slow down.',
    action: (sim) => {
      sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
      sim.setTotalAvailableGas(sim.state.maxGasCapacity)
      sim.setStateField('wellUnloadActive', false)
      sim.setStateField('salesValvePosition', 0)
    },
    duration: 16000,
  },
  {
    phase: 'close',
    title: 'ROI',
    say: "Based on your pad size and the event frequency you told us about, Well Logic typically pays for itself in sixty to ninety days. After that, it's pure upside.",
    presenterNote: 'If they entered their numbers in the questionnaire, the ROI is calculated. Reference it.',
    action: null,
    duration: 14000,
  },
  {
    phase: 'close',
    title: 'Questions',
    say: "That's Well Logic. What questions do you have?",
    presenterNote: 'Stop here. Let them talk. This is where deals happen.',
    action: null,
    duration: 0, // stays here
  },
]

export default function AutoPilot({ sim, onExit }) {
  const { isAdmin, settings } = useAuth()
  const [step, setStep] = useState(-1) // -1 = not started
  const [paused, setPaused] = useState(false)
  const [uploadedAudio, setUploadedAudio] = useState(null)
  const [scriptVisible, setScriptVisible] = useState(settings?.demoPresentationScriptDefault ?? true)
  const timerRef = useRef(null)
  const audioRef = useRef(null)

  const timings = settings?.demoPresentationTimings || {}
  const serverVoiceover = settings?.presentationVoiceover
  const resolvedVoiceoverUrl = serverVoiceover?.url
    ? `${API_BASE}${serverVoiceover.url}`
    : DEFAULT_VOICEOVER_URL

  const getStepDuration = (index) => timings[index] ?? SCRIPT[index]?.duration ?? 0

  // Mirror `paused` into a ref so the setTimeout inside scheduleAdvance
  // always reads the LATEST value when it fires, not the closure from
  // the render when it was scheduled. Without this, clicking Next
  // would pause the sim correctly but the auto-advance timer set by
  // the new step would still fire seconds later (its closure thinks
  // paused is still false), making it look like the sim is still
  // progressing on its own.
  const pausedRef = useRef(false)
  useEffect(() => { pausedRef.current = paused }, [paused])

  const currentStep = step >= 0 && step < SCRIPT.length ? SCRIPT[step] : null

  const displayState = FORCE_ALL_RED_STEPS.has(step)
    ? { ...sim.state, wells: sim.state.wells.map(w => ({ ...w, isAtTarget: false, actualRate: 0, chokeAO: 0 })) }
    : sim.state
  const m = getMetrics(displayState)

  const scheduleAdvance = (nextStep, duration) => {
    if (duration <= 0) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (!pausedRef.current) advanceStep(nextStep + 1)
    }, duration)
  }

  const advanceStep = (nextStep) => {
    if (nextStep >= SCRIPT.length) return
    const s = SCRIPT[nextStep]
    setStep(nextStep)

    // Execute action
    if (s.action) s.action(sim)

    // Auto advance after duration (admin-configurable, else SCRIPT default)
    scheduleAdvance(nextStep, getStepDuration(nextStep))
  }

  const stopUploadedAudio = () => {
    if (!audioRef.current) return
    audioRef.current.pause()
    audioRef.current.currentTime = 0
  }

  const startUploadedAudio = () => {
    if (!uploadedAudio?.url) return
    stopUploadedAudio()
    const audio = new Audio(uploadedAudio.url)
    audioRef.current = audio
    audio.play().catch(() => {})
  }

  // Keep the simulation clock in lock-step with the narration controls.
  // Without this, pausing/jumping the narration freezes the teleprompter
  // words but the underlying simulation keeps ticking, so by the time
  // the presenter resumes the visual no longer matches what they just
  // described. Every narration control must also stop (or restart) the
  // sim's internal tick loop.
  const pauseSim = () => {
    if (sim.running) sim.toggleRunning()
  }
  const resumeSim = () => {
    if (!sim.running) sim.toggleRunning()
  }

  // Replay every SCRIPT action from index 0 up to and including
  // `targetStep`, running the sim forward for each step's duration so
  // downstream physics (wells going red after a comp trip, pressures
  // re-balancing after a gas drop) actually propagate on-screen.
  //
  // Without the fastForward-per-step, a manual Next into "Impact"
  // right after "Compressor Trips" showed the trip action applied
  // (C1 OFFLINE) but every well still green, because the gas chain
  // hadn't had time to tick. The narration says "all wells going
  // red" but the sim disagreed.
  //
  // Each sim tick is driven by useSimulation's 500 ms setInterval; so
  // the count of ticks that would have fired during a tile's live
  // playback is duration / 500. We cap at 60 ticks per step (30 sim-
  // seconds) to avoid a noticeable freeze on long tiles.
  const TICK_INTERVAL_MS = 500
  const MAX_TICKS_PER_STEP = 60

  const replayToStep = (targetStep) => {
    if (typeof sim.resetToDefaults !== 'function') return
    sim.resetToDefaults()
    for (let i = 0; i <= targetStep && i < SCRIPT.length; i += 1) {
      const s = SCRIPT[i]
      if (s?.action) {
        try { s.action(sim) } catch { /* ignore action errors during replay */ }
      }
      // Fast-forward the sim for this step's duration so the
      // consequences of its action settle before we move to the next.
      const ticks = Math.min(
        MAX_TICKS_PER_STEP,
        Math.ceil((s?.duration || 0) / TICK_INTERVAL_MS),
      )
      if (ticks > 0 && typeof sim.fastForward === 'function') {
        sim.fastForward(ticks)
      }
    }
  }

  const start = () => {
    // Prefer locally uploaded audio; fall back to server/default voiceover
    if (uploadedAudio?.url) {
      startUploadedAudio()
    } else {
      stopUploadedAudio()
      const audio = new Audio(resolvedVoiceoverUrl)
      audioRef.current = audio
      audio.play().catch(() => {})
    }
    resumeSim()
    advanceStep(0)
  }
  const pause = () => {
    setPaused(true)
    clearTimeout(timerRef.current)
    audioRef.current?.pause()
    pauseSim()
  }
  const resume = () => {
    setPaused(false)
    audioRef.current?.play().catch(() => {})
    resumeSim()
    if (step >= 0) scheduleAdvance(step, getStepDuration(step))
  }
  const next = () => {
    const target = Math.min(step + 1, SCRIPT.length - 1)
    clearTimeout(timerRef.current)
    stopUploadedAudio()
    // Manual navigation pauses the sim so the visible state lines up
    // with the narration tile the presenter jumped to. Presenter then
    // clicks Resume to let the sim continue ticking.
    setPaused(true)
    pauseSim()
    // Rebuild the sim state by replaying ALL prior actions plus the
    // target's — skips scheduleAdvance (no auto-advance while paused).
    replayToStep(target)
    setStep(target)
  }
  const prev = () => {
    const target = Math.max(step - 1, 0)
    clearTimeout(timerRef.current)
    stopUploadedAudio()
    setPaused(true)
    pauseSim()
    // Rewind by resetting + replaying actions 0..target. This is the
    // only deterministic way to "go back a step" since the SCRIPT
    // actions aren't individually reversible.
    replayToStep(target)
    setStep(target)
  }

  const handleAudioUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (uploadedAudio?.url) {
      URL.revokeObjectURL(uploadedAudio.url)
    }

    setUploadedAudio({
      name: file.name,
      url: URL.createObjectURL(file),
    })
  }

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
      stopUploadedAudio()
      if (uploadedAudio?.url) {
        URL.revokeObjectURL(uploadedAudio.url)
      }
    }
  }, [uploadedAudio])

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#050508]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#03172A] border-b border-[#293C5B] shrink-0">
        <div className="flex items-center gap-3">
          <WellLogicCompact size={32} />
          <span className="text-sm text-white" style={{ fontFamily: "'Montserrat'" }}>Well Logic Presentation</span>
        </div>
        <div className="flex items-center gap-2">
          {step >= 0 && (
            <>
              <span className="text-[10px] text-[#888]">{step + 1} / {SCRIPT.length}</span>
              <button onClick={prev} className="px-2 py-1 text-[10px] text-[#888] border border-[#333] rounded hover:text-white">← Prev</button>
              {paused ? (
                <button onClick={resume} className="px-3 py-1 text-[10px] font-bold bg-[#22c55e] text-black rounded">▶ Resume</button>
              ) : (
                <button onClick={pause} className="px-3 py-1 text-[10px] font-bold text-[#eab308] border border-[#eab308]/30 rounded">⏸ Pause</button>
              )}
              <button onClick={next} className="px-2 py-1 text-[10px] text-[#888] border border-[#333] rounded hover:text-white">Next →</button>
              <button onClick={() => setScriptVisible(v => !v)}
                className="px-2 py-1 text-[10px] text-[#888] border border-[#333] rounded hover:text-white">
                {scriptVisible ? '▶| Script' : '|◀ Script'}
              </button>
            </>
          )}
          <button onClick={() => { clearTimeout(timerRef.current); stopUploadedAudio(); onExit() }}
            className="px-3 py-1 text-[10px] font-bold text-[#888] border border-[#333] rounded hover:text-white hover:border-[#D32028]">
            ✕ Exit
          </button>
        </div>
      </div>

      {step < 0 ? (
        /* START SCREEN */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <WellLogicCompact size={56} />
            </div>
            <div className="text-4xl text-white font-bold mb-3" style={{ fontFamily: "'Montserrat'" }}>Well Logic</div>
            <div className="text-sm text-[#888] mb-8">Automated Gas Lift Injection Optimization</div>
            {isAdmin && (
              <>
                <div className="mb-6 w-[360px] max-w-full mx-auto bg-[#0F3C64] border border-[#222] rounded-xl p-4 text-left">
                  <label className="block text-[10px] text-[#888] mb-2 uppercase tracking-[0.2em] font-bold">
                    Presentation Narration Audio
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    className="block w-full text-[11px] text-[#aaa] file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-[#D32028] file:text-white file:font-bold hover:file:bg-[#B01A20]"
                  />
                  <p className="text-[10px] text-[#666] mt-2">
                    Upload your recorded narration. It will play from the start when the presentation begins and pause with the presentation.
                  </p>
                  {uploadedAudio ? (
                    <div className="mt-3">
                      <div className="text-[10px] text-[#22c55e] font-bold mb-2">Loaded: {uploadedAudio.name}</div>
                      <audio controls src={uploadedAudio.url} className="w-full" />
                    </div>
                  ) : (
                    <div className="text-[10px] text-[#555] mt-3">
                      No AI voice will be used. If you do not upload a file, the presentation runs silently.
                    </div>
                  )}
                </div>
                <div className="mb-6 text-[10px] text-[#555]">
                  Manual `Next` or `Prev` will stop the uploaded narration track so it does not drift out of sync.
                </div>
              </>
            )}
            <button onClick={start}
              className="px-12 py-4 bg-[#D32028] hover:bg-[#B01A20] text-white font-bold rounded-xl text-lg transition-all hover:scale-105 shadow-xl shadow-[#D32028]/30"
              style={{ fontFamily: "'Montserrat'" }}>
              ▶ Start Presentation
            </button>
            <p className="text-[10px] text-[#555] mt-4">
              {isAdmin
                ? 'Runs automatically with your uploaded narration track. Use Pause/Next to control pace.'
                : 'Runs automatically as a silent presentation. Admin login is required to load narration audio.'}
            </p>
          </div>
        </div>
      ) : (
        /* PRESENTATION */
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Live diagram — overflow-auto so the SiteOverview SVG is
               never clipped on the left edge when the presenter panel
               takes its 320 px. When paused, the `sim-paused` class
               freezes the CSS flow-line animations so there's no
               visual motion at all (matches the sim's internal pause)
               and a PAUSED overlay makes the state unmistakable. */}
          <div className={`flex-1 min-h-0 min-w-0 overflow-auto relative ${paused ? 'sim-paused' : ''}`}>
            <SiteOverview state={displayState} config={sim.state.config} />
            {paused && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  background: 'rgba(211, 32, 40, 0.92)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: 2,
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 800,
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
                  zIndex: 5,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    background: '#FFFFFF',
                    borderRadius: 1,
                  }}
                />
                Simulation Paused
              </div>
            )}
            {/* Reset button */}
            <button onClick={() => {
              sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
              sim.setTotalAvailableGas(sim.state.maxGasCapacity)
              sim.setStateField('wellUnloadActive', false)
              sim.setStateField('salesValvePosition', 0)
            }}
              className="absolute top-3 right-3 z-10 px-3 py-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-black text-[10px] font-bold rounded-lg shadow-lg transition-all"
              style={{ fontFamily: "'Montserrat'" }}>
              ↩ RESET
            </button>
          </div>

          {/* Presenter panel — teleprompter + notes */}
          {scriptVisible && <div className="w-[320px] shrink-0 bg-[#03172A] border-l border-[#293C5B] flex flex-col overflow-hidden">
            {currentStep && (
              <>
                {/* Phase indicator */}
                <div className="px-4 py-2 bg-[#111120] border-b border-[#293C5B] shrink-0">
                  <div className="text-[8px] text-[#D32028] uppercase tracking-wider font-bold">{currentStep.phase}</div>
                  <div className="text-[14px] text-white font-bold" style={{ fontFamily: "'Montserrat'" }}>{currentStep.title}</div>
                </div>

                {/* What to say — teleprompter */}
                <div className="px-4 py-3 bg-[#0c1a0c] border-b border-[#1a2a1a] flex-1 overflow-y-auto">
                  <div className="text-[8px] text-[#22c55e] uppercase tracking-wider font-bold mb-2">💬 SAY THIS</div>
                  <p className="text-[14px] text-[#ddd] leading-relaxed">{currentStep.say}</p>
                </div>

                {/* Presenter notes */}
                {currentStep.presenterNote && (
                  <div className="px-4 py-3 bg-[#1a1a10] border-t border-[#2a2a1a] shrink-0">
                    <div className="text-[8px] text-[#eab308] uppercase tracking-wider font-bold mb-1">📋 PRESENTER NOTE</div>
                    <p className="text-[11px] text-[#aaa] leading-relaxed">{currentStep.presenterNote}</p>
                  </div>
                )}
              </>
            )}

            {/* Progress */}
            <div className="px-4 py-2 bg-[#03172A] border-t border-[#293C5B] shrink-0">
              <div className="flex gap-0.5">
                {SCRIPT.map((_, i) => (
                  <div key={i} className={`flex-1 h-1 rounded-full ${i < step ? 'bg-[#D32028]' : i === step ? 'bg-[#D32028] animate-pulse' : 'bg-[#222]'}`} />
                ))}
              </div>
            </div>
          </div>}
        </div>
      )}

      {/* Bottom metrics */}
      {step >= 0 && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-[#03172A] border-t border-[#293C5B] shrink-0">
          <Metric label="Injection" value={`${m.totalActualMcfd.toFixed(0)}`} unit="MCFD" />
          <Metric label="Accuracy" value={`${m.injectionAccuracy.toFixed(0)}%`}
            color={m.injectionAccuracy >= 95 ? '#22c55e' : m.injectionAccuracy >= 70 ? '#eab308' : '#D32028'} />
          <Metric label="Production" value={`${m.totalProductionBoe.toFixed(0)}`} unit="BOE/day" />
          <Metric label="Compressors" value={`${m.compressorsOnline}/${m.compressorsTotal}`}
            color={m.compressorsOnline === m.compressorsTotal ? '#22c55e' : '#D32028'} />
          <Metric label="Wells OK" value={`${m.wellsAtTarget}/${m.wellsTotal}`}
            color={m.wellsAtTarget === m.wellsTotal ? '#22c55e' : '#D32028'} />
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, unit, color }) {
  return (
    <div className="bg-[#111120] rounded px-2.5 py-1 min-w-[90px] shrink-0">
      <div className="text-[7px] text-[#555] uppercase">{label}</div>
      <span className="text-[12px] font-bold" style={{ color: color || '#fff', fontFamily: "'Montserrat'" }}>{value}</span>
      {unit && <span className="text-[7px] text-[#555] ml-1">{unit}</span>}
    </div>
  )
}
