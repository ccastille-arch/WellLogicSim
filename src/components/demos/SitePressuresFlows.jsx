import { useMemo } from 'react'

/**
 * SitePressuresFlows — a single read-at-a-glance dashboard for every
 * pressure and flow on the pad, plus two live-tunable knobs: per-
 * compressor capacity and total available gas supply.
 *
 * Why it exists (per the Apr 16 request): the Sales Demo page stacks a
 * lot of scenario tiles on the right, but there was no one place to
 * see "what is every number right now?" This tab fills that gap and
 * gives the presenter direct levers so they can drive the story
 * ("watch what happens when the compressor can only push 1000 MCFD")
 * without digging through per-scenario UIs.
 *
 * Slider ranges are 500 → 10,000,000 MCFD per the requirement. The
 * sim's internal clamp already allows the full range (see
 * GAS_SUPPLY_UI_MAX = 10,000,000 in src/engine/simulation.js).
 */

const MCFD_MIN = 500
const MCFD_MAX = 10_000_000
// Logarithmic slider mapping — a linear range of 500..10M is useless
// because 95% of the usable band (under 50k) would be cramped into the
// first fraction of the track. Mapping position ∈ [0,1] onto
// exp(ln(min) + position * (ln(max) - ln(min))) gives equal visual
// resolution across each order of magnitude.
const LN_MIN = Math.log(MCFD_MIN)
const LN_MAX = Math.log(MCFD_MAX)

function sliderToValue(pos) {
  const clamped = Math.max(0, Math.min(1, pos))
  return Math.round(Math.exp(LN_MIN + clamped * (LN_MAX - LN_MIN)))
}
function valueToSlider(v) {
  const clamped = Math.max(MCFD_MIN, Math.min(MCFD_MAX, v))
  return (Math.log(clamped) - LN_MIN) / (LN_MAX - LN_MIN)
}
function fmt(v, digits = 0) {
  if (v == null || !Number.isFinite(v)) return '—'
  return Number(v).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export default function SitePressuresFlows({ sim }) {
  if (!sim?.state) {
    return <div className="flex-1 flex items-center justify-center text-[#888]">Loading…</div>
  }
  const { state } = sim
  const {
    compressors = [],
    wells = [],
    suctionHeaderPressure,
    scrubberPressure,
    suctionTarget,
    suctionHighRange,
    suctionLowRange,
    totalAvailableGas,
    maxGasCapacity,
    salesValvePosition,
  } = state

  const totalActualFlow = useMemo(
    () => compressors.reduce((s, c) => s + (c.actualFlow ?? c.flow ?? 0), 0),
    [compressors],
  )
  const totalInjection = useMemo(
    () => wells.reduce((s, w) => s + (w.actualRate ?? 0), 0),
    [wells],
  )
  const totalDesired = useMemo(
    () => wells.reduce((s, w) => s + (w.desiredRate ?? 0), 0),
    [wells],
  )

  const suctionHigh = (suctionTarget ?? 0) + (suctionHighRange ?? 0)
  const suctionLow = Math.max(0, (suctionTarget ?? 0) - (suctionLowRange ?? 0))

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6" style={{ background: '#05233E' }}>
      <div className="max-w-[1100px] mx-auto">
        <div className="sc-eyebrow mb-2">Site · Inputs &amp; Readings</div>
        <h2
          className="text-white mb-1"
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: '-0.3px',
          }}
        >
          Pressures &amp; Flows
        </h2>
        <p className="text-[12px] text-[#A7B3C4] mb-6">
          Every pressure and flow on the pad, all in one place. Dial in the
          compressor capacity and total gas supply below to drive what the
          customer sees on the diagram.
        </p>

        {/* ── Tunables ────────────────────────────────────────────── */}
        <Section title="Live Knobs" subtitle="500 MCFD minimum · 10,000,000 MCFD maximum — sets what the compressors can push and what gas is available to them.">
          <div className="space-y-4">
            <LogSlider
              label="Total Gas Supply Available"
              unit="MCFD"
              value={totalAvailableGas}
              onChange={(v) => sim.setTotalAvailableGas?.(v)}
              helperText="Caps the combined gas feeding the compressors. Use this to simulate formation decline or upstream restriction."
            />
            {compressors.map((c, idx) => (
              <LogSlider
                key={c.id ?? idx}
                label={`Compressor C${(c.id ?? idx + 1)} Capacity`}
                unit="MCFD"
                value={c.capacityMcfd}
                onChange={(v) => sim.setCompressorCapacity?.(c.id ?? idx + 1, v)}
                helperText={`Max flow this compressor can push. Actual flow = min(capacity, gas routed to it). Currently flowing ${fmt(c.actualFlow ?? c.flow ?? 0)} MCFD.`}
              />
            ))}
          </div>
        </Section>

        {/* ── Flow readings ───────────────────────────────────────── */}
        <Section title="Flow Readings" subtitle="Combined pad and per-unit flows.">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Stat label="Total Gas Supply" value={fmt(totalAvailableGas)} unit="MCFD" accent="#49D0E2" />
            <Stat label="Max Rated Capacity" value={fmt(maxGasCapacity)} unit="MCFD" accent="#FFFFFF" />
            <Stat label="Total Compressor Flow" value={fmt(totalActualFlow)} unit="MCFD" accent="#49D0E2" />
            <Stat label="Total Injection Flow" value={fmt(totalInjection)} unit="MCFD" accent="#22c55e" />
            <Stat label="Target Injection" value={fmt(totalDesired)} unit="MCFD" accent="#FFFFFF" />
            <Stat
              label="Injection Accuracy"
              value={totalDesired > 0 ? `${((Math.min(totalInjection, totalDesired) / totalDesired) * 100).toFixed(1)}%` : '—'}
              accent={totalInjection >= totalDesired * 0.95 ? '#22c55e' : totalInjection >= totalDesired * 0.7 ? '#eab308' : '#D32028'}
            />
          </div>
        </Section>

        {/* ── Pressures ───────────────────────────────────────────── */}
        <Section title="Pressures" subtitle="Suction header, scrubber, and sales valve state.">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Suction Header" value={fmt(suctionHeaderPressure, 1)} unit="PSI" accent="#49D0E2" />
            <Stat label="Suction Target" value={fmt(suctionTarget, 0)} unit="PSI" accent="#FFFFFF" />
            <Stat label="Suction Low Band" value={fmt(suctionLow, 0)} unit="PSI" accent="#A7B3C4" />
            <Stat label="Suction High Band" value={fmt(suctionHigh, 0)} unit="PSI" accent="#A7B3C4" />
            <Stat label="Scrubber" value={fmt(scrubberPressure, 1)} unit="PSI" accent="#eab308" />
            <Stat
              label="Sales Valve"
              value={`${Math.round(salesValvePosition ?? 0)}%`}
              accent={salesValvePosition > 1 ? '#D32028' : '#22c55e'}
            />
          </div>
        </Section>

        {/* ── Per-compressor ──────────────────────────────────────── */}
        <Section title="Per-Compressor" subtitle="Current operating point vs. rated capacity.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {compressors.map((c, idx) => {
              const actual = c.actualFlow ?? c.flow ?? 0
              const cap = c.capacityMcfd ?? 0
              const pctOfCap = cap > 0 ? (actual / cap) * 100 : 0
              return (
                <div
                  key={c.id ?? idx}
                  className="sc-card"
                  style={{ borderRadius: 2, padding: 14 }}
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <span
                      style={{
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 800,
                        fontSize: 18,
                        color: '#FFFFFF',
                        letterSpacing: '-0.2px',
                      }}
                    >
                      C{c.id ?? idx + 1}
                    </span>
                    <span
                      className={`sc-pill ${c.status === 'running' ? 'sc-pill--live' : c.status === 'tripped' ? 'sc-pill--alarm' : 'sc-pill--cyan'}`}
                    >
                      {String(c.status || 'idle').toUpperCase()}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Mini label="Actual" value={fmt(actual)} unit="MCFD" color="#49D0E2" />
                    <Mini label="Capacity" value={fmt(cap)} unit="MCFD" color="#FFFFFF" />
                    <Mini label="Load" value={`${pctOfCap.toFixed(0)}%`} color={pctOfCap > 95 ? '#D32028' : pctOfCap > 75 ? '#eab308' : '#22c55e'} />
                  </div>
                  <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.35)' }}>
                    <div style={{ width: `${Math.min(100, pctOfCap)}%`, height: '100%', background: pctOfCap > 95 ? '#D32028' : pctOfCap > 75 ? '#eab308' : '#22c55e' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        {/* ── Per-well ────────────────────────────────────────────── */}
        <Section title="Per-Well" subtitle="Actual injection vs. setpoint per wellhead.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {wells.map((w, idx) => {
              const actual = w.actualRate ?? 0
              const desired = w.desiredRate ?? 0
              const gap = actual - desired
              // Overshoots count as 100% match (matches the fix on the
              // Live Performance Proof page — wells above setpoint are
              // hitting target, not missing it).
              const matchPct = desired > 0
                ? (actual >= desired ? 100 : Math.max(0, (actual / desired) * 100))
                : 0
              return (
                <div
                  key={w.id ?? idx}
                  className="sc-card"
                  style={{ borderRadius: 2, padding: 14 }}
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <span
                      style={{
                        fontFamily: "'Montserrat', sans-serif",
                        fontWeight: 800,
                        fontSize: 16,
                        color: '#FFFFFF',
                        letterSpacing: '-0.2px',
                      }}
                    >
                      Well {w.id ?? idx + 1}
                    </span>
                    <span
                      className={`sc-pill ${actual >= desired * 0.97 ? 'sc-pill--live' : 'sc-pill--alarm'}`}
                    >
                      {actual >= desired * 0.97 ? 'On Target' : 'Under'}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <Mini label="Actual" value={fmt(actual)} unit="MCFD" color="#49D0E2" />
                    <Mini label="Desired" value={fmt(desired)} unit="MCFD" color="#FFFFFF" />
                    <Mini label="Gap" value={`${gap > 0 ? '+' : ''}${fmt(gap)}`} unit="MCFD" color={Math.abs(gap) < desired * 0.03 ? '#22c55e' : gap < 0 ? '#D32028' : '#eab308'} />
                    <Mini label="Match" value={`${matchPct.toFixed(1)}%`} color={matchPct >= 97 ? '#22c55e' : matchPct >= 80 ? '#eab308' : '#D32028'} />
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      </div>
    </div>
  )
}

/* ───────────────────────── helpers ──────────────────────────────── */

function Section({ title, subtitle, children }) {
  return (
    <section className="mb-6">
      <div className="mb-3">
        <div
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#49D0E2',
            marginBottom: 2,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.2 }}>
            {subtitle}
          </div>
        )}
      </div>
      {children}
    </section>
  )
}

function Stat({ label, value, unit, accent }) {
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderLeft: `3px solid ${accent || '#FFFFFF'}`,
        padding: '10px 14px',
        borderRadius: 2,
      }}
    >
      <div
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontSize: 9,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.55)',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 20,
            fontWeight: 800,
            color: accent || '#FFFFFF',
            letterSpacing: '-0.2px',
          }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.6 }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  )
}

function Mini({ label, value, unit, color }) {
  return (
    <div>
      <div
        style={{
          fontSize: 8,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 700,
          fontSize: 14,
          color: color || '#FFFFFF',
          lineHeight: 1.1,
          marginTop: 2,
        }}
      >
        {value}
      </div>
      {unit && (
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)' }}>{unit}</div>
      )}
    </div>
  )
}

function LogSlider({ label, unit, value, onChange, helperText }) {
  const pos = valueToSlider(value || MCFD_MIN)
  const handleSliderChange = (e) => {
    const next = sliderToValue(parseFloat(e.target.value))
    onChange?.(next)
  }
  const handleNumberChange = (e) => {
    const raw = parseFloat(e.target.value)
    if (!Number.isFinite(raw)) return
    const clamped = Math.max(MCFD_MIN, Math.min(MCFD_MAX, raw))
    onChange?.(clamped)
  }
  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderLeft: '3px solid #D32028',
        padding: '14px 16px',
        borderRadius: 2,
      }}
    >
      <div className="flex items-baseline justify-between mb-2 gap-3 flex-wrap">
        <label
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.85)',
          }}
        >
          {label}
        </label>
        <div className="flex items-baseline gap-2">
          <input
            type="number"
            min={MCFD_MIN}
            max={MCFD_MAX}
            step={10}
            value={Math.round(value || 0)}
            onChange={handleNumberChange}
            style={{
              width: 110,
              padding: '4px 8px',
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#FFFFFF',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              borderRadius: 2,
              textAlign: 'right',
            }}
          />
          {unit && (
            <span
              style={{
                fontSize: 10,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              {unit}
            </span>
          )}
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={pos}
        onChange={handleSliderChange}
        className="w-full accent-[#D32028]"
        style={{ marginTop: 2 }}
      />
      <div className="flex justify-between mt-1">
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{fmt(MCFD_MIN)}</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{fmt(MCFD_MAX)}</span>
      </div>
      {helperText && (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 8, lineHeight: 1.45 }}>
          {helperText}
        </p>
      )}
    </div>
  )
}
