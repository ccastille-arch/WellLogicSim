import { useState } from 'react'

// Customer Questionnaire — non-sensitive operational questions only
// No accounting data, no financials from the customer
// We calculate economics using public Brent Crude + standard Permian Basin burden rates

const QUESTIONS = [
  { section: 'About Your Operation', questions: [
    { key: 'customerName', label: 'Company Name', type: 'text', placeholder: 'e.g. Permian Resources' },
    { key: 'padName', label: 'Pad / Lease Name', type: 'text', placeholder: 'e.g. Wolfcamp A 14H' },
    { key: 'basin', label: 'Basin', type: 'select', options: ['Permian — Delaware', 'Permian — Midland', 'Eagle Ford', 'DJ Basin', 'Bakken', 'Other'], default: 'Permian — Delaware' },
    { key: 'wellCount', label: 'How many wells on this pad?', type: 'number', min: 1, max: 20, default: 6 },
    { key: 'compressorCount', label: 'How many compressors?', type: 'number', min: 1, max: 6, default: 2 },
    { key: 'avgWellProduction', label: 'Average well production (BOE/day)?', type: 'number', min: 10, max: 2000, default: 120, unit: 'BOE/day' },
  ]},
  { section: 'Response Times', questions: [
    { key: 'dayResponseMin', label: 'Avg operator response time — DAYTIME (minutes to reach pad)?', type: 'number', min: 5, max: 300, default: 45, unit: 'min' },
    { key: 'nightResponseMin', label: 'Avg operator response time — NIGHTTIME / WEEKENDS?', type: 'number', min: 15, max: 480, default: 90, unit: 'min' },
    { key: 'roundTripHours', label: 'Average total time per trip (drive + diagnose + fix + drive back)?', type: 'number', min: 0.5, max: 8, default: 2.5, step: 0.5, unit: 'hours' },
  ]},
  { section: 'Event Frequency', questions: [
    { key: 'compTripsMonth', label: 'How many compressor shutdowns/trips per month?', type: 'number', min: 0, max: 30, default: 4 },
    { key: 'gasConstraintWeek', label: 'How often is gas supply constrained (times per week)?', type: 'number', min: 0, max: 14, default: 2 },
    { key: 'wellUnloadWeek', label: 'How often do wells slug or unload (times per week)?', type: 'number', min: 0, max: 20, default: 3 },
    { key: 'siteVisitsWeek', label: 'Total operator site visits per week (all reasons)?', type: 'number', min: 1, max: 30, default: 8 },
  ]},
  { section: 'Current Setup', questions: [
    { key: 'currentControl', label: 'How are choke valves controlled today?', type: 'select',
      options: ['Manual — pumper adjusts on-site', 'Timer-based automation', 'Basic PLC / RTU', 'SCADA with manual setpoints', 'No automation'], default: 'Manual — pumper adjusts on-site' },
    { key: 'nighttimeCoverage', label: 'Do you have 24/7 monitoring?', type: 'select',
      options: ['No — unmanned overnight', 'Call-out only (on-call pumper)', 'Partial — SCADA alarms to phone', '24/7 staffed control room'], default: 'No — unmanned overnight' },
  ]},
]

// Standard West Texas / Permian Basin burden rates (public knowledge)
export const INDUSTRY_RATES = {
  // Loaded operator burden rate (salary + benefits + truck + fuel + insurance)
  operatorBurdenRate: 85, // $/hour — standard Permian pumper fully loaded
  // Overtime/night premium multiplier
  nightPremium: 1.5,
  // Average downtime per unattended compressor trip (hours until pumper arrives + fixes)
  avgUnatendedDowntime: 3, // hours
  // Production loss during constraint events (% of pad production affected)
  constraintProductionLoss: 0.25, // 25% of production typically affected
  // WellLogic recovery rate (% of lost production WellLogic saves vs manual)
  wellLogicRecoveryPct: 0.85, // saves 85% of what would be lost
  // Avoided site visits per week with WellLogic (reduces unnecessary trips)
  avoidedVisitsPct: 0.30, // reduces trips by 30%
}

export default function CustomerQuestionnaire({ data, onChange, onComplete }) {
  const [currentSection, setCurrentSection] = useState(0)
  const totalSections = QUESTIONS.length

  const set = (key, val) => onChange({ ...data, [key]: val })

  const isComplete = data.customerName && data.wellCount && data.dayResponseMin

  return (
    <div className="flex-1 flex items-center justify-center bg-[#080810] overflow-auto py-8">
      <div className="w-[600px] max-w-full px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-2xl tracking-tight" style={{ fontFamily: "'Arial Black'", fontStyle: 'italic', color: '#E8200C' }}>
            FieldTune™
          </span>
          <h1 className="text-xl text-white mt-2" style={{ fontFamily: "'Arial Black'" }}>
            WellLogic™ — Custom Demo Setup
          </h1>
          <p className="text-[12px] text-[#888] mt-1">
            Answer a few questions about your operation so we can show you exactly how WellLogic performs on YOUR pad.
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-6">
          {QUESTIONS.map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${
              i <= currentSection ? 'bg-[#E8200C]' : 'bg-[#333]'
            }`} />
          ))}
        </div>

        {/* Current section */}
        <div className="bg-[#111118] rounded-xl border border-[#222] p-6">
          <h2 className="text-sm text-[#E8200C] font-bold uppercase tracking-wider mb-4"
            style={{ fontFamily: "'Arial Black'" }}>
            {QUESTIONS[currentSection].section}
          </h2>

          <div className="space-y-4">
            {QUESTIONS[currentSection].questions.map(q => (
              <QuestionField key={q.key} question={q} value={data[q.key] ?? q.default ?? ''} onChange={v => set(q.key, v)} />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setCurrentSection(s => Math.max(0, s - 1))}
            disabled={currentSection === 0}
            className="px-4 py-2 text-[11px] font-bold text-[#888] border border-[#333] rounded hover:text-white hover:border-[#555] disabled:opacity-30"
          >
            ← Back
          </button>

          <span className="text-[10px] text-[#555]">{currentSection + 1} of {totalSections}</span>

          {currentSection < totalSections - 1 ? (
            <button
              onClick={() => setCurrentSection(s => Math.min(totalSections - 1, s + 1))}
              className="px-4 py-2 text-[11px] font-bold bg-[#E8200C] text-white rounded hover:bg-[#c01a0a]"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={onComplete}
              disabled={!isComplete}
              className="px-6 py-2 text-[11px] font-bold bg-[#E8200C] text-white rounded hover:bg-[#c01a0a] disabled:opacity-30"
            >
              Launch Demo →
            </button>
          )}
        </div>

        {/* Skip option */}
        <div className="text-center mt-4">
          <button onClick={onComplete} className="text-[10px] text-[#555] hover:text-[#888] underline">
            Skip questionnaire — use defaults
          </button>
        </div>
      </div>
    </div>
  )
}

function QuestionField({ question, value, onChange }) {
  const { label, type, placeholder, options, min, max, step, unit } = question

  return (
    <div>
      <label className="block text-[11px] text-[#ccc] mb-1.5 font-medium">{label}</label>
      <div className="flex items-center gap-2">
        {type === 'text' ? (
          <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            className="flex-1 bg-[#0a0a14] border border-[#333] rounded px-3 py-2 text-white text-sm outline-none focus:border-[#E8200C]" />
        ) : type === 'select' ? (
          <select value={value} onChange={e => onChange(e.target.value)}
            className="flex-1 bg-[#0a0a14] border border-[#333] rounded px-3 py-2 text-white text-sm outline-none focus:border-[#E8200C]">
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
            min={min} max={max} step={step || 1}
            className="w-28 bg-[#0a0a14] border border-[#333] rounded px-3 py-2 text-white text-sm text-right outline-none focus:border-[#E8200C]" />
        )}
        {unit && <span className="text-[10px] text-[#666] shrink-0">{unit}</span>}
      </div>
    </div>
  )
}
