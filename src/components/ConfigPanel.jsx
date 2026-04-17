import { useState } from 'react'
import MarketingHub from './marketing/MarketingHub'

// Commissioning Setup — replaces the old config screen
// Site configuration + all parameters from the Pad Optimization spec
// User fills this out, then launches the simulator

const DEFAULTS = {
  compressorCount: 2,
  wellCount: 4,
  compressorMaxFlowRate: 1600,
  siteType: 'greenfield',
  suctionTarget: 80,
  suctionHighRange: 20,
  suctionLowRange: 40,
  staggerOffset: 2,
  dischargeShutdownPressure: 600,
  dischargeSlowdownOffset: 50,
  maxTempAtPlate: 165,
  coolerOutletSP: 200,
  secondStageSuctionCoolerSP: 200,
  unloadRateThreshold: 5,
  unloadSpikeThreshold: 15,
  stabilityTimer: 60,
  stagingLockoutTimer: 300,
  salesMode: false,
}

// Klondike COP0001 — calibrated from 30-day field data
// 4 wells, 2 compressors, West Texas gas lift pad
// Setpoints: W1=1.0, W2=0.75, W3=0.8, W4=0.8 MMSCFD
// Injection pressure: ~805 PSI static, ~45 PSI differential
// Temperature: ~137°F
const KLONDIKE_PRESET = {
  compressorCount: 2,
  wellCount: 4,
  compressorMaxFlowRate: 1600,
  siteType: 'brownfield',
  suctionTarget: 80,
  suctionHighRange: 20,
  suctionLowRange: 40,
  staggerOffset: 2,
  dischargeShutdownPressure: 600,
  dischargeSlowdownOffset: 50,
  maxTempAtPlate: 165,
  coolerOutletSP: 200,
  secondStageSuctionCoolerSP: 200,
  unloadRateThreshold: 5,
  unloadSpikeThreshold: 15,
  stabilityTimer: 60,
  stagingLockoutTimer: 300,
  salesMode: false,
  // Klondike-specific: well setpoints in MCFD (W1=1000, W2=750, W3=800, W4=800)
  wellSetpoints: [1000, 750, 800, 800],
}

export default function ConfigPanel({ onLaunch, forceSalesMode }) {
  const [cfg, setCfg] = useState({ ...DEFAULTS, salesMode: forceSalesMode || false })
  const [showMarketing, setShowMarketing] = useState(false)

  const set = (field, value) => setCfg(prev => ({ ...prev, [field]: value }))

  const handleLaunch = () => {
    onLaunch({ ...cfg, salesMode: forceSalesMode || cfg.salesMode })
  }

  if (showMarketing) {
    return <MarketingHub onClose={() => setShowMarketing(false)} />
  }

  return (
    <div className="flex-1 overflow-auto bg-[#0e0e14]">
      <div className="max-w-[900px] mx-auto py-8 px-6">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl text-white mb-1 tracking-tight" style={{ fontFamily: "'Montserrat', Arial, sans-serif" }}>
            Commissioning Setup
          </h1>
          <p className="text-sm text-[#888]">
            Pad Optimization Panel Configuration
          </p>
          <p className="text-[11px] text-[#555] mt-1">
            Configure site equipment and commissioning parameters, then launch the simulator.
          </p>
        </div>

        {/* ═══════ FIELD DATA PRESETS ═══════ */}
        <div className="mb-5 bg-[#0a1420] rounded-lg border border-[#1a3a5a] p-4">
          <div className="text-[10px] text-[#4fc3f7] font-bold uppercase tracking-wider mb-2">📂 Load from Field Data</div>
          <div className="flex gap-3">
            <button
              onClick={() => setCfg({ ...KLONDIKE_PRESET })}
              className="flex-1 text-left bg-[#0c1c30] rounded border border-[#1a3a5a] hover:border-[#4fc3f7] p-3 transition-colors"
            >
              <div className="text-[11px] text-white font-bold">Klondike COP0001</div>
              <div className="text-[9px] text-[#888] mt-0.5">2 compressors · 4 wells · W1=1.0 W2=0.75 W3=0.8 W4=0.8 MMSCFD</div>
              <div className="text-[9px] text-[#4fc3f7] mt-0.5">Calibrated from 30-day field data</div>
            </button>
          </div>
        </div>

        {/* ═══════ SALES DEMO MODE — TOP OF PAGE ═══════ */}
        <div className="mb-5 bg-[#0F3C64] rounded-lg border-2 border-[#D32028]/30 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm text-white font-bold flex items-center gap-2" style={{ fontFamily: "'Montserrat', Arial, sans-serif" }}>
                <span className="text-[#D32028]">★</span> Sales Demo Mode
              </h2>
              <p className="text-[11px] text-[#888] mt-1">
                Interactive presentation mode for client meetings. Walks through each Pad Logic capability with
                live demonstrations and pre-built scenario triggers. No technical details exposed.
              </p>
            </div>
            <div
              className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer shrink-0 ml-4 ${cfg.salesMode ? 'bg-[#D32028]' : 'bg-[#333]'}`}
              onClick={() => set('salesMode', !cfg.salesMode)}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${cfg.salesMode ? 'translate-x-7' : 'translate-x-1'}`} />
            </div>
          </div>
          {cfg.salesMode && (
            <div className="mt-3 bg-[#D32028]/5 rounded p-3 border border-[#D32028]/20">
              <p className="text-[11px] text-[#D32028]">
                Sales Mode will launch with guided demo scenarios. Each scenario has interactive trigger buttons
                your prospect can click to see Pad Logic respond in real time.
              </p>
            </div>
          )}
        </div>

        {/* ═══════ MARKETING MATERIALS ═══════ */}
        <button
          onClick={() => setShowMarketing(true)}
          className="w-full mb-5 bg-[#0F3C64] rounded-lg border border-[#222] p-4 flex items-center gap-4 hover:border-[#4fc3f7]/50 transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-lg bg-[#4fc3f7]/10 border border-[#4fc3f7]/30 flex items-center justify-center shrink-0">
            <span className="text-2xl">📦</span>
          </div>
          <div className="flex-1">
            <h2 className="text-sm text-white font-bold" style={{ fontFamily: "'Montserrat', Arial, sans-serif" }}>
              Pad Logic Marketing Hub
            </h2>
            <p className="text-[11px] text-[#888] mt-0.5">
              Product videos, sales sheets, ROI templates, technical specs, and a full presentation slide deck.
            </p>
          </div>
          <span className="text-[#4fc3f7] text-sm">→</span>
        </button>

        {/* ═══════ SITE CONFIGURATION ═══════ */}
        <Section number="" title="Site Equipment Configuration">
          <div className="grid grid-cols-2 gap-4">
            {/* Compressor Count */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#aaa] mb-2">
                Number of Compressors
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(n => (
                  <button
                    key={n}
                    onClick={() => set('compressorCount', n)}
                    className={`flex-1 py-2.5 rounded text-sm font-bold transition-all ${
                      cfg.compressorCount === n
                        ? 'bg-[#D32028] text-white'
                        : 'bg-[#1a1a24] text-[#888] hover:bg-[#222] hover:text-white border border-[#333]'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Well Count */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#aaa] mb-2">
                Number of Wells
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={1} max={10} value={cfg.wellCount}
                  onChange={e => set('wellCount', Number(e.target.value))}
                  className="flex-1 accent-[#D32028]"
                />
                <span className="text-xl font-bold text-white w-8 text-center">{cfg.wellCount}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <ParamInput
              label="Compressor Max Flow Rate"
              value={cfg.compressorMaxFlowRate}
              unit="MCFD per compressor"
              onChange={v => set('compressorMaxFlowRate', v)}
              min={100}
              max={4000}
              step={50}
              description="Applied to each compressor when the simulation launches"
            />
          </div>

          {/* Site Type */}
          <div className="mt-4">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#aaa] mb-2">
              Site Type
            </label>
            <div className="flex gap-3">
              {[
                { value: 'greenfield', label: 'Common Discharge Header', desc: 'All compressors feed a shared discharge header — branches to each well' },
                { value: 'brownfield', label: 'One Compressor to One Well', desc: '1:1 mapping — each compressor feeds a dedicated well directly' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => set('siteType', opt.value)}
                  className={`flex-1 py-3 px-4 rounded text-left transition-all border ${
                    cfg.siteType === opt.value
                      ? 'border-[#D32028] bg-[#D32028]/10'
                      : 'border-[#333] bg-[#1a1a24] hover:border-[#555]'
                  }`}
                >
                  <div className={`text-sm font-bold mb-0.5 ${cfg.siteType === opt.value ? 'text-white' : 'text-[#aaa]'}`}>
                    {opt.label}
                  </div>
                  <div className="text-[11px] text-[#666] leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══════ §1: Suction Header ═══════ */}
        <Section number="1" title="Suction Header Target Pressure">
          <p className="text-[11px] text-[#999] mb-3">
            System continuously monitors suction header pressure and maintains it at target. Upper range allows temporary overshoot during restart, unload, or imbalance. Lower range determines compressor suction slowdown setpoints.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ParamInput label="Suction Header Target Pressure" value={cfg.suctionTarget} unit="PSI"
              onChange={v => set('suctionTarget', v)} min={20} max={200} />
            <ParamInput label="Suction Header High Range" value={cfg.suctionHighRange} unit="PSI above target"
              onChange={v => set('suctionHighRange', v)} min={0} max={100}
              description="Max allowable pressure above target" />
            <ParamInput label="Suction Header Low Range" value={cfg.suctionLowRange} unit="PSI"
              onChange={v => set('suctionLowRange', v)} min={10} max={150}
              description="Used ONLY to calculate compressor slowdown SP" />
            <ParamInput label="Compressor Stagger Offset" value={cfg.staggerOffset} unit="PSI"
              onChange={v => set('staggerOffset', v)} min={0} max={20} step={0.5}
              description="Offset between compressor suction SPs to prevent hunting" />
          </div>
          <CalcBox>
            Upper Limit = {(cfg.suctionTarget + cfg.suctionHighRange).toFixed(0)} PSI (Target + High Range)
            <br />
            Base Speed Auto Suction SP = {(cfg.suctionLowRange + 2).toFixed(0)} PSI (Low Range + 2)
            {cfg.compressorCount > 1 && cfg.staggerOffset > 0 && (
              <>
                <br />
                {Array.from({ length: cfg.compressorCount }, (_, i) =>
                  `C${i + 1} = ${(cfg.suctionLowRange + 2 + i * cfg.staggerOffset).toFixed(1)} PSI`
                ).join('  |  ')}
              </>
            )}
          </CalcBox>
        </Section>

        {/* ═══════ §2B: Discharge SP ═══════ */}
        <Section number="2B" title="Speed Auto Discharge SP">
          <p className="text-[11px] text-[#999] mb-3">
            Defines discharge pressure where compressor begins slowing down. Calculated from high discharge shutdown minus slowdown offset.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ParamInput label="High Discharge Shutdown Pressure" value={cfg.dischargeShutdownPressure} unit="PSI"
              onChange={v => set('dischargeShutdownPressure', v)} min={200} max={1200}
              description="Compressor high discharge trip point" />
            <ParamInput label="Discharge Slowdown Offset" value={cfg.dischargeSlowdownOffset} unit="PSI"
              onChange={v => set('dischargeSlowdownOffset', v)} min={10} max={200}
              description="How far below shutdown to begin slowing" />
          </div>
          <CalcBox>
            Speed Auto Discharge SP = {cfg.dischargeShutdownPressure} − {cfg.dischargeSlowdownOffset} = <strong>{(cfg.dischargeShutdownPressure - cfg.dischargeSlowdownOffset).toFixed(0)} PSI</strong>
            <br />
            <span className="text-[#666]">Written to all compressors</span>
          </CalcBox>
        </Section>

        {/* ═══════ §2C: Cooler Outlet ═══════ */}
        <Section number="2C" title="Cooler Outlet Temperature SP">
          <p className="text-[11px] text-[#999] mb-3">
            Maintains gas as hot as possible without exceeding max temp at flow meter plate. If exceeded, cooler outlet SP is lowered.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ParamInput label="Max Gas Temp at Flow Meter Plate" value={cfg.maxTempAtPlate} unit="°F"
              onChange={v => set('maxTempAtPlate', v)} min={100} max={250} />
            <ParamInput label="Default Cooler Outlet SP" value={cfg.coolerOutletSP} unit="°F"
              onChange={v => set('coolerOutletSP', v)} min={100} max={300} />
          </div>
        </Section>

        {/* ═══════ §2D: Second Stage ═══════ */}
        <Section number="2D" title="Second Stage Suction Cooler SP">
          <div className="grid grid-cols-2 gap-3">
            <ParamInput label="Second Stage Suction Cooler SP" value={cfg.secondStageSuctionCoolerSP} unit="°F"
              onChange={v => set('secondStageSuctionCoolerSP', v)} min={100} max={300}
              description="Written to compressors (default 200°F)" />
          </div>
          <div className="mt-2 bg-[#1a1a10] rounded border border-[#3a3a20] p-2">
            <span className="text-[10px] text-[#eab308]">⚠ If Murphy conflict: write register once every 24 hours instead of continuous overwrite</span>
          </div>
        </Section>

        {/* ═══════ §4A: Well Unload ═══════ */}
        <Section number="4A" title="Well Unload Detection">
          <p className="text-[11px] text-[#999] mb-3">
            Detects rapid pressure spikes at vertical scrubber. When detected, suction pressure may rise toward upper range and sales valve opens.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ParamInput label="Scrubber Rate-of-Change Threshold" value={cfg.unloadRateThreshold} unit="PSI/sec"
              onChange={v => set('unloadRateThreshold', v)} min={1} max={20} step={0.5}
              description="Rate threshold for unload detection" />
            <ParamInput label="Scrubber Pressure Spike Threshold" value={cfg.unloadSpikeThreshold} unit="PSI"
              onChange={v => set('unloadSpikeThreshold', v)} min={5} max={50}
              description="Absolute pressure spike threshold" />
          </div>
        </Section>

        {/* ═══════ §12: Staging Timers ═══════ */}
        <Section number="12" title="Compressor Staging Logic">
          <p className="text-[11px] text-[#999] mb-3">
            Stability timer requires sustained high suction before allowing start. Lockout timer prevents rapid sequential starts.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ParamInput label="Suction Pressure Stability Timer" value={cfg.stabilityTimer} unit="seconds"
              onChange={v => set('stabilityTimer', v)} min={10} max={300}
              description="Suction must exceed upper range for this long before start" />
            <ParamInput label="Compressor Staging Lockout Timer" value={cfg.stagingLockoutTimer} unit="seconds"
              onChange={v => set('stagingLockoutTimer', v)} min={60} max={900}
              description="No additional starts for this duration after any start" />
          </div>
        </Section>

        {/* ═══════ §13: Clarification ═══════ */}
        <Section number="13" title="Injection Control">
          <div className="bg-[#12121a] rounded border border-[#2a2a3a] p-3">
            <p className="text-[11px] text-[#ccc]">
              Injection control through <span className="text-white font-bold">well injection motor valves / choke valves</span> only.
            </p>
            <p className="text-[11px] text-[#ccc] mt-1">
              Compressors are <span className="text-[#D32028] font-bold">NOT</span> injection control devices. No compressor injection logic required.
            </p>
          </div>
        </Section>

        {/* ═══════ LAUNCH BUTTON ═══════ */}
        <div className="mt-6 mb-10">
          <button
            onClick={handleLaunch}
            className="w-full py-4 bg-[#D32028] hover:bg-[#B01A20] text-white font-bold rounded-lg text-sm uppercase tracking-widest transition-colors"
            style={{ fontFamily: "'Montserrat', Arial, sans-serif" }}
          >
            Launch Simulator
          </button>
          <p className="text-[10px] text-[#555] text-center mt-2">
            All commissioning values can be adjusted live after launch via the Start-Up tab.
          </p>
        </div>
      </div>
    </div>
  )
}

// ═══════ Reusable Components ═══════

function Section({ number, title, children }) {
  return (
    <div className="mb-5 bg-[#0F3C64] rounded-lg border border-[#222233] p-4">
      <div className="flex items-baseline gap-2 mb-2">
        {number && <span className="text-[10px] text-[#D32028] font-bold bg-[#D32028]/10 px-2 py-0.5 rounded">§{number}</span>}
        <h2 className="text-sm text-white font-bold" style={{ fontFamily: "'Montserrat', Arial, sans-serif" }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

function ParamInput({ label, value, unit, onChange, min, max, step = 1, description }) {
  return (
    <div className="bg-[#03172A] rounded border border-[#2a2a3a] p-3">
      <label className="block text-[10px] text-[#aaa] uppercase tracking-wider font-bold mb-1">{label}</label>
      {description && <p className="text-[9px] text-[#555] mb-2">{description}</p>}
      <div className="flex items-center gap-2">
        <input
          type="number" value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={min} max={max} step={step}
          className="w-24 bg-[#293C5B] border border-[#333] rounded px-2 py-1.5 text-white text-sm font-bold text-right outline-none focus:border-[#4fc3f7]"
        />
        <span className="text-[10px] text-[#888]">{unit}</span>
      </div>
    </div>
  )
}

function CalcBox({ children }) {
  return (
    <div className="mt-3 bg-[#12121a] rounded border border-[#2a2a3a] p-3">
      <div className="text-[9px] text-[#f97316] uppercase tracking-wider font-bold mb-1">CALCULATED VALUES</div>
      <div className="text-[11px] text-[#ccc]">{children}</div>
    </div>
  )
}
