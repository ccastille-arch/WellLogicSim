import { useState, useEffect, useRef, useCallback } from 'react'

// Tutorial step definitions for the Dashboard page
const TUTORIAL_STEPS = [
  {
    selector: '[data-tutorial="choke-row-0"]',
    title: 'WellHead Choke Controller',
    description: 'Each row represents one well\'s injection choke valve. The Pad Logic panel controls these choke valves to regulate the amount of gas injected into each well. This is the primary control mechanism for gas lift optimization.',
    position: 'bottom',
  },
  {
    selector: '[data-tutorial="choke-manual-0"]',
    title: 'Manual Setpoint (SP)',
    description: 'This is the operator\'s manual setpoint for the choke valve position (0â€“100%). Use the â†“ and â†‘ arrows to adjust. In Auto mode, the Pad Logic optimizer will override this value. In Manual mode, this value directly controls the valve.',
    position: 'bottom',
  },
  {
    selector: '[data-tutorial="choke-mode-0"]',
    title: 'Choke Control Mode',
    description: 'Toggles between Auto and Manual mode. In Auto mode, the Pad Optimization Panel controls the choke valve position automatically based on well priority and gas availability. In Manual mode, the operator sets the valve position directly.',
    position: 'bottom',
  },
  {
    selector: '[data-tutorial="choke-ao-0"]',
    title: 'Analog Output (AO)',
    description: 'This is the actual output signal being sent to the choke valve right now (0â€“100%). It reflects what the valve is actually doing â€” the real-time control output. Compare this to the Manual SP to see if the optimizer is overriding.',
    position: 'bottom',
  },
  {
    selector: '[data-tutorial="compressor-status"]',
    title: 'Compressor Run Status',
    description: 'Shows whether each compressor is currently running (green indicator) or stopped. The pad optimizer monitors all compressor states to calculate total available compression capacity and make staging decisions.',
    position: 'top',
  },
  {
    selector: '[data-tutorial="estop-indicators"]',
    title: 'Emergency Stop (E-Stop) Indicators',
    description: 'Customer Remote E-Stop and Local E-Stop indicators. Green means the E-Stop is NOT active (system is clear to operate). If either turns red, all compressors are immediately shut down for safety â€” the optimizer cannot override an E-Stop.',
    position: 'top',
  },
  {
    selector: '[data-tutorial="flow-rate-mode"]',
    title: 'Flow Rate Control Mode',
    description: '"Local" means flow rate setpoints are controlled from this panel. "Remote" means setpoints are received from a remote SCADA/DCS system. In a live deployment, this determines who has control authority over injection rates.',
    position: 'top',
  },
  {
    selector: '[data-tutorial="page-nav"]',
    title: 'Page Navigation',
    description: 'The panel has 5 pages. Page 1 (this page) shows the main dashboard with choke controls. Other pages show well priority settings, suction header parameters, hunt sequence controls, and active alarms. Use the arrows or dots to navigate.',
    position: 'bottom',
  },
  {
    selector: '[data-tutorial="metrics-bar"]',
    title: 'Live Metrics Dashboard',
    description: 'Real-time site-wide metrics: total injection rate (MCFD), injection accuracy (actual vs desired), total oil production (BOE/day), number of compressors online, and how many wells are hitting their target injection rate. These update every tick.',
    position: 'bottom',
  },
  {
    selector: '[data-tutorial="bottom-bar"]',
    title: 'System Control Bar',
    description: 'Stop, Reset, and Start controls for the simulation. The green status bar shows which wells are currently running and the site type (Gas Lift or Oil). In a live system, this bar reflects the real-time operating state of the entire pad.',
    position: 'top',
  },
]

export default function TutorialOverlay({ active, onEnd }) {
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const overlayRef = useRef(null)

  const currentStep = TUTORIAL_STEPS[step]

  const measureTarget = useCallback(() => {
    if (!active || !currentStep) return
    const el = document.querySelector(currentStep.selector)
    if (el) {
      const rect = el.getBoundingClientRect()
      setTargetRect(rect)
      // Scroll element into view if needed
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } else {
      setTargetRect(null)
    }
  }, [active, step, currentStep])

  useEffect(() => {
    if (!active) { setStep(0); return }
    measureTarget()
    const interval = setInterval(measureTarget, 500)
    return () => clearInterval(interval)
  }, [active, step, measureTarget])

  useEffect(() => {
    if (!active) return
    const handleKey = (e) => {
      if (e.key === 'Escape') { onEnd(); return }
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (step < TUTORIAL_STEPS.length - 1) setStep(s => s + 1)
        else onEnd()
      }
      if (e.key === 'ArrowLeft') {
        if (step > 0) setStep(s => s - 1)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [active, step, onEnd])

  if (!active) return null

  const padding = 8

  // Calculate bubble position â€” clamped to stay within viewport
  let bubbleStyle = {}
  if (targetRect) {
    const bw = 340 // bubble width
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Try preferred position, fallback if it goes off-screen
    const pos = currentStep.position || 'right'
    const fitsRight = targetRect.right + 16 + bw < vw
    const fitsLeft = targetRect.left - 16 - bw > 0
    const fitsBelow = targetRect.bottom + 12 + 200 < vh

    let chosen = pos
    if (pos === 'right' && !fitsRight) chosen = fitsLeft ? 'left' : 'below'
    if (pos === 'left' && !fitsLeft) chosen = fitsRight ? 'right' : 'below'

    if (chosen === 'right') {
      const top = Math.max(10, Math.min(targetRect.top, vh - 280))
      bubbleStyle = { top, left: Math.min(targetRect.right + 16, vw - bw - 10), maxWidth: bw }
    } else if (chosen === 'left') {
      const top = Math.max(10, Math.min(targetRect.top, vh - 280))
      bubbleStyle = { top, right: Math.max(10, vw - targetRect.left + 16), maxWidth: bw }
    } else if (chosen === 'below' || pos === 'bottom') {
      const left = Math.max(10, Math.min(targetRect.left, vw - bw - 10))
      bubbleStyle = { top: Math.min(targetRect.bottom + 12, vh - 280), left, maxWidth: bw }
    } else if (pos === 'top') {
      const left = Math.max(10, Math.min(targetRect.left, vw - bw - 10))
      bubbleStyle = { bottom: Math.max(10, vh - targetRect.top + 12), left, maxWidth: bw }
    }
  }

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50" style={{ pointerEvents: 'none' }}>
      {/* Dark overlay with cutout for highlighted element */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'auto' }}>
        <defs>
          <mask id="tutorial-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx={8}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%" height="100%"
          fill="rgba(0,0,0,0.7)"
          mask="url(#tutorial-mask)"
          onClick={onEnd}
        />
      </svg>

      {/* Highlight border around target */}
      {targetRect && (
        <div
          className="absolute border-2 border-[#4fc3f7] rounded-lg"
          style={{
            left: targetRect.left - padding,
            top: targetRect.top - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            boxShadow: '0 0 20px rgba(79, 195, 247, 0.4), inset 0 0 20px rgba(79, 195, 247, 0.1)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip bubble */}
      {targetRect && (
        <div
          className="absolute bg-[#1a1a2e] border border-[#4fc3f7] rounded-xl shadow-2xl"
          style={{ ...bubbleStyle, pointerEvents: 'auto', zIndex: 60 }}
        >
          <div className="p-4">
            {/* Step counter */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[#4fc3f7] uppercase tracking-wider font-bold">
                Step {step + 1} of {TUTORIAL_STEPS.length}
              </span>
              <button
                onClick={onEnd}
                className="text-[#888] hover:text-white text-sm leading-none"
              >âœ•</button>
            </div>
            {/* Title */}
            <h4 className="text-sm font-bold text-white mb-2" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
              {currentStep.title}
            </h4>
            {/* Description */}
            <p className="text-[12px] text-[#ccc] leading-relaxed mb-4">
              {currentStep.description}
            </p>
            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => step > 0 && setStep(s => s - 1)}
                disabled={step === 0}
                className="px-3 py-1 text-[11px] font-bold text-[#888] hover:text-white disabled:opacity-30 disabled:cursor-default"
              >
                â† Back
              </button>
              {/* Progress dots */}
              <div className="flex gap-1">
                {TUTORIAL_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === step ? 'bg-[#4fc3f7]' : i < step ? 'bg-[#4fc3f7]/40' : 'bg-[#555]'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => {
                  if (step < TUTORIAL_STEPS.length - 1) setStep(s => s + 1)
                  else onEnd()
                }}
                className="px-3 py-1 text-[11px] font-bold bg-[#4fc3f7] text-black rounded hover:bg-[#29b6f6]"
              >
                {step < TUTORIAL_STEPS.length - 1 ? 'Next â†’' : 'Finish'}
              </button>
            </div>
            <div className="text-[9px] text-[#666] mt-2 text-center">
              Use arrow keys or click to navigate. Esc to exit.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

