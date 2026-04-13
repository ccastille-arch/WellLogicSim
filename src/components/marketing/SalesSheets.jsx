import { useState } from 'react'

const SHEETS = [
  { id: 'overview', title: 'WellLogic™ Product Overview', desc: 'One-page overview of WellLogic capabilities for gas lift optimization.' },
  { id: 'roi', title: 'ROI Analysis Template', desc: 'Customizable ROI breakdown based on pad configuration and operational data.' },
  { id: 'comparison', title: 'Manual vs WellLogic Comparison', desc: 'Side-by-side comparison of manual operations vs WellLogic automation.' },
  { id: 'specs', title: 'Technical Specifications', desc: 'Panel specifications, I/O counts, communication protocols, and certifications.' },
]

export default function SalesSheets() {
  const [viewing, setViewing] = useState(null)

  if (viewing) {
    return (
      <div className="p-6 max-w-[900px] mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setViewing(null)} className="text-[11px] text-[#888] hover:text-white flex items-center gap-1">← Back to all sheets</button>
          <button onClick={() => window.print()}
            className="px-4 py-1.5 text-[11px] font-bold text-white bg-[#E8200C] hover:bg-[#c01a0a] rounded-lg flex items-center gap-2">
            ↓ Download / Print
          </button>
        </div>
        {viewing === 'overview' && <OverviewSheet />}
        {viewing === 'roi' && <ROISheet />}
        {viewing === 'comparison' && <ComparisonSheet />}
        {viewing === 'specs' && <SpecsSheet />}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      <h2 className="text-lg text-white font-bold mb-1" style={{ fontFamily: "'Arial Black'" }}>Sales Sheets & Leave-Behinds</h2>
      <p className="text-[12px] text-[#888] mb-6">Professional one-pagers ready to share with prospects. Click to preview.</p>
      <div className="grid grid-cols-2 gap-4">
        {SHEETS.map(s => (
          <button key={s.id} onClick={() => setViewing(s.id)}
            className="bg-[#111118] rounded-xl border border-[#222] p-5 text-left hover:border-[#E8200C]/50 transition-colors">
            <div className="text-3xl mb-3">📄</div>
            <h3 className="text-[13px] text-white font-bold">{s.title}</h3>
            <p className="text-[11px] text-[#888] mt-1">{s.desc}</p>
            <div className="mt-3 text-[10px] text-[#E8200C] font-bold">View →</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function SheetPage({ children }) {
  return (
    <div className="bg-white rounded-lg shadow-2xl p-8 text-black max-w-[800px] mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Letterhead */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-[#E8200C]">
        <div>
          <div className="text-xl font-bold" style={{ fontFamily: "'Arial Black'", fontStyle: 'italic', color: '#E8200C' }}>FieldTune™</div>
          <div className="text-[10px] text-gray-500 tracking-wider">SERVICE COMPRESSION</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold" style={{ fontFamily: "'Arial Black'" }}>WellLogic™</div>
          <div className="text-[10px] text-gray-500">Gas Lift Optimization</div>
        </div>
      </div>
      {children}
      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-[9px] text-gray-400 flex justify-between">
        <span>Service Compression — Confidential</span>
        <span>servicecompression.com</span>
      </div>
    </div>
  )
}

function OverviewSheet() {
  return (
    <SheetPage>
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Arial Black'" }}>WellLogic™ Pad Optimization</h1>
      <p className="text-sm text-gray-600 mb-6">Automated gas lift injection control for maximum production uptime.</p>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-sm font-bold text-[#E8200C] mb-2">What It Does</h3>
          <ul className="text-[11px] text-gray-700 space-y-1.5">
            <li>• Automatically controls well injection choke valves</li>
            <li>• Prioritizes gas to your highest-value wells</li>
            <li>• Detects and responds to compressor trips in seconds</li>
            <li>• Manages suction header pressure for stable compression</li>
            <li>• Detects well unloads and prevents pad shutdowns</li>
            <li>• Stages compressors automatically based on demand</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#E8200C] mb-2">Why It Matters</h3>
          <ul className="text-[11px] text-gray-700 space-y-1.5">
            <li>• Eliminates 2-4 hour manual response gaps</li>
            <li>• Protects production during nighttime/weekend events</li>
            <li>• Reduces unnecessary operator site visits by 30%+</li>
            <li>• Prevents cascading failures from single events</li>
            <li>• Typical ROI: $400K-$900K/year per pad</li>
            <li>• Pays for itself in 30-90 days</li>
          </ul>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-bold mb-2">How It Works — The Loop</h3>
        <div className="text-[11px] text-gray-600 leading-relaxed">
          Wells produce → Production header → HP Scrubber/Separator → Gas recirculates → Suction header →
          Compressors → Discharge header → Injection chokes (WellLogic controlled) → Flow meters → Back to wells.
          WellLogic sits at the center, controlling the choke valves and monitoring every pressure, flow, and compressor in real-time.
        </div>
      </div>
    </SheetPage>
  )
}

function ROISheet() {
  return (
    <SheetPage>
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Arial Black'" }}>ROI Analysis</h1>
      <p className="text-sm text-gray-600 mb-6">Estimated annual savings from WellLogic deployment.</p>

      <table className="w-full text-[11px] mb-6">
        <thead><tr className="border-b-2 border-[#E8200C]">
          <th className="text-left py-2 font-bold">Savings Category</th>
          <th className="text-right py-2 font-bold">Assumptions</th>
          <th className="text-right py-2 font-bold">Annual Savings</th>
        </tr></thead>
        <tbody className="text-gray-700">
          <tr className="border-b border-gray-100"><td className="py-2">Compressor Trip Recovery</td><td className="text-right">4 trips/mo × 3hr avg response</td><td className="text-right font-bold text-[#E8200C]">$180K - $350K</td></tr>
          <tr className="border-b border-gray-100"><td className="py-2">Gas Constraint Protection</td><td className="text-right">2 events/wk × 25% production affected</td><td className="text-right font-bold text-[#E8200C]">$120K - $280K</td></tr>
          <tr className="border-b border-gray-100"><td className="py-2">Avoided Shutdowns</td><td className="text-right">~24 prevented/yr</td><td className="text-right font-bold text-[#E8200C]">$80K - $180K</td></tr>
          <tr className="border-b border-gray-100"><td className="py-2">Labor Savings</td><td className="text-right">30% fewer site visits × $85/hr burden</td><td className="text-right font-bold text-[#E8200C]">$40K - $90K</td></tr>
          <tr className="border-t-2 border-[#E8200C]"><td className="py-2 font-bold text-black">Total Estimated Savings</td><td></td><td className="text-right font-bold text-[#E8200C] text-lg">$420K - $900K</td></tr>
        </tbody>
      </table>

      <div className="bg-gray-50 rounded p-3 text-[10px] text-gray-500">
        Based on a typical 4-well, 2-compressor Permian Basin gas lift pad. Actual savings depend on well count, production rates, event frequency, and oil price. Uses Brent crude benchmark and standard West Texas operator burden rates.
      </div>
    </SheetPage>
  )
}

function ComparisonSheet() {
  return (
    <SheetPage>
      <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "'Arial Black'" }}>Manual vs WellLogic</h1>

      <table className="w-full text-[11px]">
        <thead><tr className="border-b-2 border-gray-300">
          <th className="text-left py-2 w-1/3">Scenario</th>
          <th className="text-left py-2 w-1/3 text-[#E8200C]">Manual Operations</th>
          <th className="text-left py-2 w-1/3 text-[#22c55e]">With WellLogic</th>
        </tr></thead>
        <tbody className="text-gray-700">
          {[
            ['Compressor trips at 2AM', 'Production down 2-4 hrs until pumper arrives, diagnoses, calls mechanic, returns to readjust chokes', 'Auto-rebalances in 30-60 seconds. Priority wells never lose injection.'],
            ['Gas supply constrained', 'All wells starved equally. No prioritization.', 'Top-priority wells protected. Bottom wells curtailed first.'],
            ['Well unloads / slugs', 'Risk of full pad shutdown. Pumper may not notice until next visit.', 'Detected instantly. Sales valve opens to relieve pressure.'],
            ['Multiple compressors down', 'Cascading failure. Hours of chaos.', 'Automatic staging and priority enforcement across remaining capacity.'],
            ['Night / weekend coverage', 'Unmanned. On-call pumper 45-90 min away.', '24/7 automatic. Same response at 2AM as 2PM.'],
            ['Choke adjustments', 'Manual — pumper drives to pad, adjusts each well.', 'Automatic — continuous optimization, zero trips needed.'],
          ].map(([scenario, manual, wl], i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-2 font-bold text-black">{scenario}</td>
              <td className="py-2 text-[#E8200C]">{manual}</td>
              <td className="py-2 text-[#22c55e]">{wl}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SheetPage>
  )
}

function SpecsSheet() {
  return (
    <SheetPage>
      <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "'Arial Black'" }}>Technical Specifications</h1>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-bold text-[#E8200C] mb-2">Panel</h3>
          <table className="text-[11px] w-full">
            <tbody>{[
              ['Controller', 'FieldTune DE-4000'],
              ['Enclosure', 'NEMA 4X Stainless Steel'],
              ['Power', '24VDC / 120VAC'],
              ['Operating Temp', '-40°F to 140°F'],
              ['Hazardous Area', 'Class I, Div 2 rated'],
            ].map(([k, v], i) => <tr key={i} className="border-b border-gray-100"><td className="py-1 text-gray-500">{k}</td><td className="py-1 font-bold text-right">{v}</td></tr>)}</tbody>
          </table>
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#E8200C] mb-2">I/O Capacity</h3>
          <table className="text-[11px] w-full">
            <tbody>{[
              ['Analog Inputs', 'Up to 32'],
              ['Analog Outputs', 'Up to 16 (4-20mA)'],
              ['Digital I/O', 'Up to 32'],
              ['Wells Supported', 'Up to 16 per panel'],
              ['Compressors', 'Up to 6 per panel'],
            ].map(([k, v], i) => <tr key={i} className="border-b border-gray-100"><td className="py-1 text-gray-500">{k}</td><td className="py-1 font-bold text-right">{v}</td></tr>)}</tbody>
          </table>
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#E8200C] mb-2">Communications</h3>
          <table className="text-[11px] w-full">
            <tbody>{[
              ['Compressor Comms', 'Modbus RTU/TCP'],
              ['SCADA', 'Modbus, DNP3, MQTT'],
              ['Remote Access', 'Cellular / Ethernet'],
              ['Cloud', 'FieldTune Cloud Dashboard'],
            ].map(([k, v], i) => <tr key={i} className="border-b border-gray-100"><td className="py-1 text-gray-500">{k}</td><td className="py-1 font-bold text-right">{v}</td></tr>)}</tbody>
          </table>
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#E8200C] mb-2">Deployment</h3>
          <table className="text-[11px] w-full">
            <tbody>{[
              ['Engineering', '2 weeks'],
              ['Panel Build', '3-4 weeks'],
              ['Commissioning', '1-2 days on-site'],
              ['Total Lead Time', '6-8 weeks'],
            ].map(([k, v], i) => <tr key={i} className="border-b border-gray-100"><td className="py-1 text-gray-500">{k}</td><td className="py-1 font-bold text-right">{v}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </SheetPage>
  )
}
