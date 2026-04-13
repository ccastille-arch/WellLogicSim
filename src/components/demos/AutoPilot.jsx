import { useState, useEffect, useRef } from 'react'
import SiteOverview from '../SiteOverview'
import { getMetrics } from '../../engine/simulation'

// AUTO-PILOT PRESENTATION MODE
// Runs the entire WellLogic demo automatically.
// Brad just stands there. The tool does everything.
// Narrates each step, triggers events, shows results, moves on.

const SCRIPT = [
  // Each step: what to say (teleprompter), what to do (action), how long to wait
  {
    phase: 'intro',
    title: 'Welcome',
    say: "What you're looking at is a live simulation of a gas lift injection pad — the same equipment you're running today. Four wells, two compressors, injection chokes on every well.",
    presenterNote: 'Let them look at the diagram for a moment. Point out the wells at top, compressors at bottom.',
    action: null,
    duration: 8000,
  },
  {
    phase: 'intro',
    title: 'Normal Operations',
    say: "Right now everything is running perfectly. Every well is getting exactly the gas it needs. All compressors online. One hundred percent injection accuracy.",
    presenterNote: 'Point to the green metrics at bottom. All wells green, both compressors running.',
    action: null,
    duration: 7000,
  },
  {
    phase: 'trip',
    title: 'Compressor Trips',
    say: "Now watch what happens when a compressor goes down unexpectedly.",
    presenterNote: 'Pause for effect. Let them watch.',
    action: (sim) => sim.setCompressorStatus(0, 'tripped'),
    duration: 3000,
  },
  {
    phase: 'trip',
    title: 'Impact',
    say: "Every well on the pad just lost injection pressure. You can see them all going red. Production is dropping right now.",
    presenterNote: 'Point to wells turning yellow/red. Point to accuracy dropping.',
    action: null,
    duration: 6000,
  },
  {
    phase: 'trip',
    title: 'Without WellLogic',
    say: "Without WellLogic, this is where your pumper gets a call. Forty five minutes to drive out. Another hour to diagnose and wait on a mechanic. Then he has to drive back out again just to readjust the chokes. That's three to four hours of lost production across every well on your pad.",
    presenterNote: 'This is the pain point. Let it sink in.',
    action: null,
    duration: 12000,
  },
  {
    phase: 'trip',
    title: 'WellLogic Responds',
    say: "But watch what WellLogic does. It's already detected the shortfall. It's closing chokes on your lower priority wells and redirecting all available gas to your top producers.",
    presenterNote: 'Point to wells 1 and 2 recovering to green while 3 and 4 stay curtailed.',
    action: null,
    duration: 10000,
  },
  {
    phase: 'trip',
    title: 'Priority Wells Protected',
    say: "Your number one and number two wells are back at full target injection. Your best producers never stopped. That happened in under sixty seconds. No phone call. No truck roll. No choke adjustments.",
    presenterNote: 'Point to W1 and W2 green. Point to the time. This is the money shot.',
    action: null,
    duration: 10000,
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
    duration: 5000,
  },
  {
    phase: 'constrain',
    title: 'Gas Supply Drops',
    say: "What happens when your gas supply starts declining? Maybe your formation is depleting, maybe there's a pipeline restriction upstream.",
    presenterNote: '',
    action: (sim) => sim.setTotalAvailableGas(sim.state.maxGasCapacity * 0.5),
    duration: 4000,
  },
  {
    phase: 'constrain',
    title: 'Priority Enforcement',
    say: "WellLogic automatically protects your highest value wells. Your number one well gets every bit of gas it needs. The lower priority wells get what's left. You're not losing production equally across the board anymore — your best wells are always protected.",
    presenterNote: 'Point to W1 staying green, W3/W4 going red. This is prioritization.',
    action: null,
    duration: 12000,
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
    duration: 4000,
  },
  {
    phase: 'unload',
    title: 'Well Unload Event',
    say: "Here's one that every production foreman has dealt with. A well slugs out. Gas slug hits your scrubber. Pressure spikes. Without automation, that can shut down your entire pad.",
    presenterNote: '',
    action: (sim) => {
      sim.setStateField('scrubberPressure', sim.state.suctionTarget + 40)
      sim.setStateField('wellUnloadActive', true)
      setTimeout(() => sim.setStateField('wellUnloadActive', false), 6000)
    },
    duration: 5000,
  },
  {
    phase: 'unload',
    title: 'WellLogic Handles It',
    say: "WellLogic detected that pressure spike instantly. It opened the sales valve to relieve pressure and kept your compressors running. No shutdown. No lost production. No middle of the night phone call.",
    presenterNote: 'Point to sales valve opening, pressure stabilizing. Compressors still green.',
    action: null,
    duration: 10000,
  },
  {
    phase: 'close',
    title: 'The Bottom Line',
    say: "This runs twenty four seven. Nights, weekends, holidays. The same response at two AM as two PM. Your best wells always get gas first. Your compressors stay running. Your pumpers aren't chasing alarms.",
    presenterNote: 'This is the close. Make eye contact.',
    action: (sim) => {
      sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
      sim.setTotalAvailableGas(sim.state.maxGasCapacity)
      sim.setStateField('wellUnloadActive', false)
      sim.setStateField('salesValvePosition', 0)
    },
    duration: 12000,
  },
  {
    phase: 'close',
    title: 'ROI',
    say: "Based on your pad size and the event frequency you told us about, WellLogic typically pays for itself in sixty to ninety days. After that, it's pure upside.",
    presenterNote: 'If they entered their numbers in the questionnaire, the ROI is calculated. Reference it.',
    action: null,
    duration: 8000,
  },
  {
    phase: 'close',
    title: 'Questions',
    say: "That's WellLogic. What questions do you have?",
    presenterNote: 'Stop here. Let them talk. This is where deals happen.',
    action: null,
    duration: 0, // stays here
  },
]

export default function AutoPilot({ sim, onExit }) {
  const [step, setStep] = useState(-1) // -1 = not started
  const [paused, setPaused] = useState(false)
  const [voices, setVoices] = useState([])
  const [selectedVoiceName, setSelectedVoiceName] = useState('')
  const timerRef = useRef(null)
  const speakingRef = useRef(false)

  // Load available voices — browsers fire voiceschanged when ready
  useEffect(() => {
    const load = () => {
      const all = window.speechSynthesis?.getVoices() || []
      const en = all.filter(v => v.lang?.startsWith('en'))
      setVoices(en.length ? en : all)
    }
    load()
    window.speechSynthesis?.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load)
  }, [])

  const currentStep = step >= 0 && step < SCRIPT.length ? SCRIPT[step] : null
  const m = getMetrics(sim.state)

  const advanceStep = (nextStep) => {
    if (nextStep >= SCRIPT.length) return
    const s = SCRIPT[nextStep]
    setStep(nextStep)

    // Execute action
    if (s.action) s.action(sim)

    // Narrate
    if (window.speechSynthesis && s.say) {
      window.speechSynthesis.cancel()
      const utter = new SpeechSynthesisUtterance(s.say)
      utter.rate = 1.1
      utter.pitch = 0.85
      const allVoices = window.speechSynthesis.getVoices()
      const chosenVoice = selectedVoiceName
        ? allVoices.find(v => v.name === selectedVoiceName)
        : allVoices.find(v => v.name.includes('Google US English') || v.name.includes('Microsoft David') || v.name.includes('Microsoft Guy')) || allVoices.find(v => v.lang === 'en-US') || allVoices[0]
      if (chosenVoice) utter.voice = chosenVoice
      speakingRef.current = true
      utter.onend = () => { speakingRef.current = false }
      window.speechSynthesis.speak(utter)
    }

    // Auto advance after duration (if not last step)
    if (s.duration > 0) {
      timerRef.current = setTimeout(() => {
        if (!paused) advanceStep(nextStep + 1)
      }, s.duration)
    }
  }

  const start = () => advanceStep(0)
  const pause = () => { setPaused(true); clearTimeout(timerRef.current); window.speechSynthesis?.cancel() }
  const resume = () => { setPaused(false); if (step >= 0) advanceStep(step) }
  const next = () => { clearTimeout(timerRef.current); window.speechSynthesis?.cancel(); advanceStep(Math.min(step + 1, SCRIPT.length - 1)) }
  const prev = () => { clearTimeout(timerRef.current); window.speechSynthesis?.cancel(); advanceStep(Math.max(step - 1, 0)) }

  useEffect(() => {
    return () => { clearTimeout(timerRef.current); window.speechSynthesis?.cancel() }
  }, [])

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#050508]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a14] border-b border-[#1a1a2a] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg" style={{ fontFamily: "'Arial Black'", fontStyle: 'italic', color: '#E8200C' }}>FieldTune™</span>
          <span className="text-sm text-white" style={{ fontFamily: "'Arial Black'" }}>WellLogic™ Presentation</span>
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
            </>
          )}
          <button onClick={() => { clearTimeout(timerRef.current); window.speechSynthesis?.cancel(); onExit() }}
            className="px-3 py-1 text-[10px] font-bold text-[#888] border border-[#333] rounded hover:text-white hover:border-[#E8200C]">
            ✕ Exit
          </button>
        </div>
      </div>

      {step < 0 ? (
        /* START SCREEN */
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl mb-2" style={{ fontFamily: "'Arial Black'", fontStyle: 'italic', color: '#E8200C' }}>FieldTune™</div>
            <div className="text-4xl text-white font-bold mb-3" style={{ fontFamily: "'Arial Black'" }}>WellLogic™</div>
            <div className="text-sm text-[#888] mb-8">Automated Gas Lift Injection Optimization</div>
            {voices.length > 0 && (
              <div className="mb-6">
                <label className="block text-[10px] text-[#888] mb-1.5">Narrator Voice</label>
                <select value={selectedVoiceName} onChange={e => setSelectedVoiceName(e.target.value)}
                  className="w-64 bg-[#111118] border border-[#333] rounded-lg px-3 py-2 text-white text-[11px] outline-none focus:border-[#E8200C]">
                  <option value="">Auto (default)</option>
                  {voices.map(v => (
                    <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                  ))}
                </select>
                {selectedVoiceName && (
                  <button onClick={() => {
                    const v = window.speechSynthesis.getVoices().find(x => x.name === selectedVoiceName)
                    const u = new SpeechSynthesisUtterance('Welcome to the WellLogic presentation.')
                    u.rate = 1.1; u.pitch = 0.85
                    if (v) u.voice = v
                    window.speechSynthesis.cancel()
                    window.speechSynthesis.speak(u)
                  }} className="mt-1.5 text-[9px] text-[#4fc3f7] hover:underline block">
                    Preview voice
                  </button>
                )}
              </div>
            )}
            <button onClick={start}
              className="px-12 py-4 bg-[#E8200C] hover:bg-[#c01a0a] text-white font-bold rounded-xl text-lg transition-all hover:scale-105 shadow-xl shadow-[#E8200C]/30"
              style={{ fontFamily: "'Arial Black'" }}>
              ▶ Start Presentation
            </button>
            <p className="text-[10px] text-[#555] mt-4">Runs automatically with voice narration. Use Pause/Next to control pace.</p>
          </div>
        </div>
      ) : (
        /* PRESENTATION */
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Live diagram */}
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden relative">
            <SiteOverview state={sim.state} config={sim.state.config} />
            {/* Reset button */}
            <button onClick={() => {
              sim.state.compressors.forEach(c => sim.setCompressorStatus(c.id, 'running'))
              sim.setTotalAvailableGas(sim.state.maxGasCapacity)
              sim.setStateField('wellUnloadActive', false)
              sim.setStateField('salesValvePosition', 0)
            }}
              className="absolute top-3 right-3 z-10 px-3 py-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-black text-[10px] font-bold rounded-lg shadow-lg transition-all"
              style={{ fontFamily: "'Arial Black'" }}>
              ↩ RESET
            </button>
          </div>

          {/* Presenter panel — teleprompter + notes */}
          <div className="w-[320px] shrink-0 bg-[#0a0a14] border-l border-[#1a1a2a] flex flex-col overflow-hidden">
            {currentStep && (
              <>
                {/* Phase indicator */}
                <div className="px-4 py-2 bg-[#111120] border-b border-[#1a1a2a] shrink-0">
                  <div className="text-[8px] text-[#E8200C] uppercase tracking-wider font-bold">{currentStep.phase}</div>
                  <div className="text-[14px] text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>{currentStep.title}</div>
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
            <div className="px-4 py-2 bg-[#0a0a14] border-t border-[#1a1a2a] shrink-0">
              <div className="flex gap-0.5">
                {SCRIPT.map((_, i) => (
                  <div key={i} className={`flex-1 h-1 rounded-full ${i < step ? 'bg-[#E8200C]' : i === step ? 'bg-[#E8200C] animate-pulse' : 'bg-[#222]'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom metrics */}
      {step >= 0 && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-[#0a0a14] border-t border-[#1a1a2a] shrink-0">
          <Metric label="Injection" value={`${m.totalActualMcfd.toFixed(0)}`} unit="MCFD" />
          <Metric label="Accuracy" value={`${m.injectionAccuracy.toFixed(0)}%`}
            color={m.injectionAccuracy >= 95 ? '#22c55e' : m.injectionAccuracy >= 70 ? '#eab308' : '#E8200C'} />
          <Metric label="Production" value={`${m.totalProductionBoe.toFixed(0)}`} unit="BOE/day" />
          <Metric label="Compressors" value={`${m.compressorsOnline}/${m.compressorsTotal}`}
            color={m.compressorsOnline === m.compressorsTotal ? '#22c55e' : '#E8200C'} />
          <Metric label="Wells OK" value={`${m.wellsAtTarget}/${m.wellsTotal}`}
            color={m.wellsAtTarget === m.wellsTotal ? '#22c55e' : '#E8200C'} />
        </div>
      )}
    </div>
  )
}

function Metric({ label, value, unit, color }) {
  return (
    <div className="bg-[#111120] rounded px-2.5 py-1 min-w-[90px] shrink-0">
      <div className="text-[7px] text-[#555] uppercase">{label}</div>
      <span className="text-[12px] font-bold" style={{ color: color || '#fff', fontFamily: "'Arial Black'" }}>{value}</span>
      {unit && <span className="text-[7px] text-[#555] ml-1">{unit}</span>}
    </div>
  )
}
