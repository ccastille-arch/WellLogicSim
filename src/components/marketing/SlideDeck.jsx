import { useState } from 'react'

const SLIDES = [
  { bg: '#03172A', content: TitleSlide },
  { bg: '#03172A', content: ProblemSlide },
  { bg: '#03172A', content: CostSlide },
  { bg: '#03172A', content: SolutionSlide },
  { bg: '#03172A', content: HowItWorksSlide },
  { bg: '#03172A', content: PrioritySlide },
  { bg: '#03172A', content: TripResponseSlide },
  { bg: '#03172A', content: UnloadSlide },
  { bg: '#03172A', content: ROISlide },
  { bg: '#03172A', content: TimelineSlide },
  { bg: '#03172A', content: CTASlide },
]

export default function SlideDeck() {
  const [slide, setSlide] = useState(0)
  const SlideContent = SLIDES[slide].content

  return (
    <div className="p-6 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg text-white font-bold" style={{ fontFamily: "'Montserrat'" }}>Presentation Deck</h2>
        <span className="text-[11px] text-[#888]">Slide {slide + 1} of {SLIDES.length} - Use arrow keys or click buttons</span>
      </div>

      {/* Slide */}
      <div className="relative bg-[#03172A] rounded-xl border border-[#222] overflow-hidden shadow-2xl"
        style={{ aspectRatio: '16/9' }}>
        <SlideContent />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-4">
        <button onClick={() => setSlide(s => Math.max(0, s - 1))} disabled={slide === 0}
          className="px-4 py-2 text-[11px] font-bold text-[#888] border border-[#333] rounded hover:text-white disabled:opacity-30">
          Previous
        </button>
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <button key={i} onClick={() => setSlide(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${i === slide ? 'bg-[#D32028]' : i < slide ? 'bg-[#D32028]/40' : 'bg-[#333]'}`} />
          ))}
        </div>
        <button onClick={() => setSlide(s => Math.min(SLIDES.length - 1, s + 1))} disabled={slide === SLIDES.length - 1}
          className="px-4 py-2 text-[11px] font-bold bg-[#D32028] text-white rounded hover:bg-[#B01A20] disabled:opacity-30">
          Next
        </button>
      </div>
    </div>
  )
}

function S({ children, className = '' }) {
  return <div className={`absolute inset-0 flex flex-col items-center justify-center px-16 ${className}`}>{children}</div>
}

function TitleSlide() {
  return (
    <S>
      <div className="text-3xl tracking-tight mb-2" style={{ fontFamily: "'Montserrat'", color: '#D32028' }}>Service Compression</div>
      <div className="text-5xl text-white font-bold mb-4" style={{ fontFamily: "'Montserrat'" }}>Well Logic TM</div>
      <div className="text-lg text-[#888]">Automated Gas Lift Injection Optimization</div>
      <div className="mt-8 w-32 h-0.5 bg-[#D32028]" />
      <div className="mt-4 text-sm text-[#555]">Service Compression</div>
    </S>
  )
}

function ProblemSlide() {
  return (
    <S className="items-start px-20">
      <div className="text-[#D32028] text-sm font-bold uppercase tracking-wider mb-2">The Problem</div>
      <div className="text-3xl text-white font-bold mb-6" style={{ fontFamily: "'Montserrat'" }}>Your Wells Can't Wait</div>
      <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-[14px]">
        {[
          ['2-4 Hour Response', 'When a compressor trips, production bleeds until someone drives out.'],
          ['Unmanned at Night', 'Events at 2AM sit unaddressed for hours. Revenue lost while you sleep.'],
          ['Manual Choke Adjustment', 'Operator drives out, adjusts chokes, drives home. Then drives back when mechanic finishes.'],
          ['No Prioritization', 'All wells lose gas equally. Your best producers suffer alongside your worst.'],
        ].map(([title, desc], i) => (
          <div key={i}>
            <div className="text-white font-bold mb-1">{title}</div>
            <div className="text-[#888] text-[12px] leading-relaxed">{desc}</div>
          </div>
        ))}
      </div>
    </S>
  )
}

function CostSlide() {
  return (
    <S>
      <div className="text-[#D32028] text-sm font-bold uppercase tracking-wider mb-2">The Cost</div>
      <div className="text-3xl text-white font-bold mb-8" style={{ fontFamily: "'Montserrat'" }}>Every Event Costs You Money</div>
      <div className="flex gap-8">
        {[
          { value: '$3,200', unit: '/hr', label: 'Lost production during compressor downtime' },
          { value: '4-8', unit: 'hrs', label: 'Average total recovery time (manual process)' },
          { value: '$25K+', unit: '/event', label: 'Full cost of a single compressor trip' },
        ].map((item, i) => (
          <div key={i} className="text-center">
            <div className="text-4xl text-[#D32028] font-bold" style={{ fontFamily: "'Montserrat'" }}>{item.value}<span className="text-lg text-[#888]">{item.unit}</span></div>
            <div className="text-[11px] text-[#888] mt-2 max-w-[200px]">{item.label}</div>
          </div>
        ))}
      </div>
    </S>
  )
}

function SolutionSlide() {
  return (
    <S>
      <div className="text-[#22c55e] text-sm font-bold uppercase tracking-wider mb-2">The Solution</div>
      <div className="text-3xl text-white font-bold mb-2" style={{ fontFamily: "'Montserrat'" }}>Well Logic TM Handles It</div>
      <div className="text-lg text-[#888] mb-8">Automatic. Instant. 24/7.</div>
      <div className="grid grid-cols-3 gap-6 text-center">
        {[
          ['30 sec', 'Response Time', 'Detects and rebalances injection in seconds, not hours.'],
          ['85%', 'Production Saved', 'Of what would otherwise be lost during every event.'],
          ['$0', 'Operator Trips', 'For choke adjustment. Well Logic handles it remotely.'],
        ].map(([value, title, desc], i) => (
          <div key={i}>
            <div className="text-3xl text-[#22c55e] font-bold" style={{ fontFamily: "'Montserrat'" }}>{value}</div>
            <div className="text-sm text-white font-bold mt-1">{title}</div>
            <div className="text-[11px] text-[#888] mt-1">{desc}</div>
          </div>
        ))}
      </div>
    </S>
  )
}

function HowItWorksSlide() {
  return (
    <S className="items-start px-16">
      <div className="text-[#4fc3f7] text-sm font-bold uppercase tracking-wider mb-2">How It Works</div>
      <div className="text-2xl text-white font-bold mb-6" style={{ fontFamily: "'Montserrat'" }}>The Well Logic Control Loop</div>
      <div className="flex items-center gap-3 text-[12px] flex-wrap justify-center">
        {['Wells Produce', 'to', 'HP Scrubber', 'to', 'Gas Recirculates', 'to', 'Suction Header', 'to', 'Compressors', 'to', 'Discharge Header', 'to', 'Choke Valves', 'to', 'Back to Wells'].map((item, i) => (
          <span key={i} className={item === 'to' ? 'text-[#D32028] text-lg' : 'bg-[#293C5B] px-3 py-1.5 rounded text-white font-bold'}>{item}</span>
        ))}
      </div>
      <div className="mt-6 text-[13px] text-[#888] text-center max-w-[640px]">
        Well Logic reads every pressure, flow, and compressor status in real time &mdash; and <span className="text-[#D32028] font-bold">directs every piece of the loop in sync</span>.
        Choke valves, compressor stages, suction-header pressure, recirculation routing: every component runs the same play, every decision lands in milliseconds.
      </div>
    </S>
  )
}

function PrioritySlide() {
  return (
    <S>
      <div className="text-[#f97316] text-sm font-bold uppercase tracking-wider mb-2">Key Feature</div>
      <div className="text-2xl text-white font-bold mb-6" style={{ fontFamily: "'Montserrat'" }}>Well Prioritization</div>
      <div className="flex gap-4 items-end mb-4">
        {[{ w: 'W1', pct: 100, pri: '#1' }, { w: 'W2', pct: 100, pri: '#2' }, { w: 'W3', pct: 35, pri: '#3' }, { w: 'W4', pct: 0, pri: '#4' }].map((item, i) => (
          <div key={i} className="text-center">
            <div className="text-[10px] text-[#888] mb-1">{item.pri}</div>
            <div className="w-20 h-32 bg-[#293C5B] rounded relative overflow-hidden border border-[#333]">
              <div className="absolute bottom-0 w-full transition-all" style={{ height: `${item.pct}%`, backgroundColor: item.pct > 80 ? '#22c55e' : item.pct > 30 ? '#eab308' : '#D32028' }} />
            </div>
            <div className="text-[12px] text-white font-bold mt-1">{item.w}</div>
            <div className="text-[10px]" style={{ color: item.pct > 80 ? '#22c55e' : item.pct > 30 ? '#eab308' : '#D32028' }}>{item.pct}%</div>
          </div>
        ))}
      </div>
      <div className="text-[13px] text-[#888] text-center max-w-[500px]">
        When gas is limited, your <span className="text-[#22c55e] font-bold">highest-value wells get gas first</span>.
        Lower-priority wells are curtailed automatically - no operator needed.
      </div>
    </S>
  )
}

function TripResponseSlide() {
  return (
    <S>
      <div className="text-[#D32028] text-sm font-bold uppercase tracking-wider mb-2">Key Feature</div>
      <div className="text-2xl text-white font-bold mb-6" style={{ fontFamily: "'Montserrat'" }}>Compressor Trip Response</div>
      <div className="grid grid-cols-2 gap-8 max-w-[700px]">
        <div className="bg-[#1a0808] rounded-lg p-4 border border-[#D32028]/30">
          <div className="text-[#D32028] font-bold text-sm mb-2">Without Well Logic</div>
          <div className="text-[12px] text-[#888] space-y-1">
            <div>SCADA alarm fires</div>
            <div>Dispatch operator (45-90 min)</div>
            <div>Diagnose issue (15 min)</div>
            <div>Call mechanic (60 min wait)</div>
            <div>Repair compressor (30 min)</div>
            <div className="text-[#D32028] font-bold">Operator drives BACK (45-90 min)</div>
            <div className="text-[#D32028] font-bold">Readjust all chokes (20 min)</div>
            <div className="text-white font-bold mt-2">Total: 3.5-5.5 hours</div>
          </div>
        </div>
        <div className="bg-[#081a08] rounded-lg p-4 border border-[#22c55e]/30">
          <div className="text-[#22c55e] font-bold text-sm mb-2">With Well Logic</div>
          <div className="text-[12px] text-[#888] space-y-1">
            <div>Detects shortfall (instant)</div>
            <div>Rebalances chokes (30-60 sec)</div>
            <div>Priority wells protected</div>
            <div>Mechanic dispatched for comp only</div>
            <div>No return trip for chokes needed</div>
            <div className="text-[#22c55e] font-bold mt-2">Total: 30-60 seconds</div>
            <div className="text-[#22c55e] font-bold">Zero choke adjustment trips</div>
          </div>
        </div>
      </div>
    </S>
  )
}

function UnloadSlide() {
  return (
    <S>
      <div className="text-[#eab308] text-sm font-bold uppercase tracking-wider mb-2">Key Feature</div>
      <div className="text-2xl text-white font-bold mb-4" style={{ fontFamily: "'Montserrat'" }}>Well Unload Detection</div>
      <div className="text-[14px] text-[#888] text-center max-w-[600px] mb-6">
        Gas slugs and liquid unloads cause rapid pressure spikes that can shut down your entire pad.
        Well Logic detects them <span className="text-white font-bold">before they become a problem</span>.
      </div>
      <div className="flex gap-3 items-center text-[12px]">
        {['Pressure Spike', 'to', 'Well Logic Detects', 'to', 'Sales Valve Opens', 'to', 'Pressure Relieved', 'to', 'Shutdown Prevented'].map((item, i) => (
          <span key={i} className={item === 'to' ? 'text-[#eab308]' : 'bg-[#293C5B] px-3 py-2 rounded text-white font-bold'}>{item}</span>
        ))}
      </div>
    </S>
  )
}

function ROISlide() {
  return (
    <S>
      <div className="text-[#4fc3f7] text-sm font-bold uppercase tracking-wider mb-2">Return on Investment</div>
      <div className="text-3xl text-white font-bold mb-6" style={{ fontFamily: "'Montserrat'" }}>Typical Annual Savings</div>
      <div className="text-6xl text-[#22c55e] font-bold mb-2" style={{ fontFamily: "'Montserrat'" }}>$400K - $900K</div>
      <div className="text-lg text-[#888] mb-6">Per pad, per year</div>
      <div className="flex gap-6 text-center text-[12px]">
        {[
          ['30-90', 'Day Payback', 'Typical time to recoup investment'],
          ['30%', 'Fewer Trips', 'Reduction in operator site visits'],
          ['85%', 'Recovery Rate', 'Of lost production saved by automation'],
        ].map(([v, t, d], i) => (
          <div key={i} className="bg-[#293C5B] rounded-lg px-5 py-3">
            <div className="text-xl text-[#4fc3f7] font-bold" style={{ fontFamily: "'Montserrat'" }}>{v}</div>
            <div className="text-white font-bold mt-1">{t}</div>
            <div className="text-[#888] text-[10px] mt-1">{d}</div>
          </div>
        ))}
      </div>
    </S>
  )
}

function TimelineSlide() {
  return (
    <S>
      <div className="text-[#f97316] text-sm font-bold uppercase tracking-wider mb-2">Implementation</div>
      <div className="text-2xl text-white font-bold mb-8" style={{ fontFamily: "'Montserrat'" }}>From Order to Live in 6-8 Weeks</div>
      <div className="flex items-center gap-2">
        {[
          { week: 'Wk 1-2', label: 'Engineering', desc: 'Site survey, I/O design, logic config' },
          { week: 'Wk 3-5', label: 'Panel Build', desc: 'Assembly, wiring, factory test' },
          { week: 'Wk 6', label: 'Ship', desc: 'Direct to your pad' },
          { week: 'Wk 7-8', label: 'Commission', desc: '1-2 days on-site setup' },
          { week: 'Day 1', label: 'LIVE', desc: 'Well Logic running 24/7' },
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full border-2 border-[#D32028] flex items-center justify-center bg-[#D32028]/10">
                <span className="text-[10px] text-[#D32028] font-bold">{step.week}</span>
              </div>
              <div className="text-[11px] text-white font-bold mt-2">{step.label}</div>
              <div className="text-[9px] text-[#888] mt-0.5 max-w-[90px]">{step.desc}</div>
            </div>
            {i < 4 && <div className="w-8 h-0.5 bg-[#D32028]/50" />}
          </div>
        ))}
      </div>
    </S>
  )
}

function CTASlide() {
  return (
    <S>
      <div className="text-4xl text-white font-bold mb-4" style={{ fontFamily: "'Montserrat'" }}>Ready to Get Started?</div>
      <div className="text-lg text-[#888] mb-8">Let's put Well Logic on your pad.</div>
      <div className="bg-[#111120] rounded-xl border border-[#D32028]/30 px-10 py-6 text-center">
        <div className="text-2xl tracking-tight mb-1" style={{ fontFamily: "'Montserrat'", color: '#D32028' }}>Well Logic TM</div>
        <div className="text-xl text-white font-bold mb-4" style={{ fontFamily: "'Montserrat'" }}>Service Compression</div>
        <div className="text-[13px] text-[#888] space-y-1">
          <div>Cody Castille - Director of Product Development</div>
          <div className="text-white">servicecompression.com</div>
        </div>
      </div>
      <div className="mt-6 text-[11px] text-[#555]">Well Logic TM is a Service Compression product.</div>
    </S>
  )
}


