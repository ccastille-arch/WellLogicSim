const ioChannels = [
  { ch: 'IN1–IN10',  type: 'Analog In (4–20 mA)', desc: 'Wellhead Choke feedback, 0–100%' },
  { ch: 'IN25',      type: 'Digital In',           desc: 'Compressor #1 Run Status' },
  { ch: 'IN26',      type: 'Digital In',           desc: 'Compressor #2 Run Status' },
  { ch: 'IN27',      type: 'Digital In',           desc: 'Compressor #3 Run Status' },
  { ch: 'IN28',      type: 'Digital In',           desc: 'Compressor #4 Run Status' },
  { ch: 'IN29',      type: 'Digital In',           desc: 'Remote / Local Control select' },
  { ch: 'IN30',      type: 'Digital In',           desc: 'Remote ESD from PLC' },
  { ch: 'IN32',      type: 'Digital In',           desc: 'Local ESD' },
  { ch: 'AO1–AO4',  type: 'Analog Out (4–20 mA)', desc: 'Wellhead #1–#4 Choke Control' },
  { ch: 'DO1',       type: 'Digital Out',          desc: 'System Status Output' },
  { ch: 'RPM1–RPM2', type: 'RPM Input',            desc: 'Engine speed inputs' },
  { ch: 'Modbus',    type: 'Communications',       desc: 'All channels mapped to Modbus registers' },
]

const faultTypes = [
  { code: 'A', label: 'Armed Immediately',            desc: 'Fault activates the moment the condition is detected — no delay.' },
  { code: 'B', label: 'Selectable Time-Delay (Reset)', desc: 'Fault becomes armed after a configurable delay following a system reset.' },
  { code: 'C', label: 'Armed After Clear + Delay',    desc: 'Fault arms only after the fault condition clears, then waits a selectable delay.' },
  { code: 'S', label: 'Scripted / Logic-Based',       desc: 'Fault activation is governed by custom script logic rather than a fixed timer.' },
]

export default function TechnicalInfo({ onBack }) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#080810] text-white" style={{ fontFamily: "'Arial', sans-serif" }}>
      {/* Header */}
      <div className="px-8 pt-8 pb-4 border-b border-[#1a1a2e]">
        <button onClick={onBack}
          className="text-[11px] text-[#888] hover:text-white transition-colors mb-4 block">
          ← Back to Home
        </button>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">📐</span>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Arial Black'" }}>
            Technical Information
          </h1>
        </div>
        <p className="text-[12px] text-[#888] ml-10">
          Altronic DE-4000 Control Panel — Sequence of Operations Reference
        </p>
      </div>

      <div className="px-8 py-6 max-w-5xl space-y-8">

        {/* System Overview */}
        <section>
          <SectionHeader label="System Overview" />
          <div className="bg-[#0d0d1a] border border-[#1e1e35] rounded-lg p-5 space-y-3">
            <p className="text-[13px] text-[#ccc] leading-relaxed">
              The <span className="text-white font-semibold">Altronic DE-4000</span> is a configurable safety shutdown and
              control system designed to monitor and control rotating machinery at wellhead and compression sites.
            </p>
            <ul className="text-[12px] text-[#aaa] space-y-2 list-none pl-2">
              {[
                'Touchscreen HMI for start/stop, setpoint adjustment, and real-time status monitoring',
                'Processes analog (4–20 mA) and digital inputs to drive automated start-up and shutdown sequences',
                'Pre-lube, engine warm-up, and cool-down sequences are fully configurable',
                'Modbus RTU/TCP communications for SCADA and PLC integration',
              ].map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[#E8200C] mt-0.5">▸</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Fault Classifications */}
        <section>
          <SectionHeader label="Fault Classifications" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {faultTypes.map(({ code, label, desc }) => (
              <div key={code} className="bg-[#0d0d1a] border border-[#1e1e35] rounded-lg p-4 flex gap-4">
                <div className="w-9 h-9 rounded bg-[#E8200C] flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-base">{code}</span>
                </div>
                <div>
                  <p className="text-[12px] font-bold text-white mb-1">{label}</p>
                  <p className="text-[11px] text-[#888] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* I/O Configuration */}
        <section>
          <SectionHeader label="I/O Configuration — Channel Mapping" />
          <div className="bg-[#0d0d1a] border border-[#1e1e35] rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#1e1e35] bg-[#0a0a18]">
                  <th className="px-4 py-3 text-left text-[#E8200C] font-bold tracking-wide w-32">Channel</th>
                  <th className="px-4 py-3 text-left text-[#E8200C] font-bold tracking-wide w-44">Type</th>
                  <th className="px-4 py-3 text-left text-[#E8200C] font-bold tracking-wide">Description</th>
                </tr>
              </thead>
              <tbody>
                {ioChannels.map(({ ch, type, desc }, i) => (
                  <tr key={ch}
                    className={`border-b border-[#1a1a2e] ${i % 2 === 0 ? 'bg-[#0d0d1a]' : 'bg-[#0b0b16]'}`}>
                    <td className="px-4 py-2.5 font-mono text-[#4fc3f7] font-semibold">{ch}</td>
                    <td className="px-4 py-2.5 text-[#aaa]">{type}</td>
                    <td className="px-4 py-2.5 text-[#ccc]">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Document Reference */}
        <section>
          <SectionHeader label="Source Document" />
          <div className="bg-[#0d0d1a] border border-[#1e1e35] rounded-lg p-4 flex items-center gap-4">
            <span className="text-3xl">📄</span>
            <div>
              <p className="text-[13px] font-semibold text-white">Altronic DE-4000 — Sequence of Operations</p>
              <p className="text-[11px] text-[#888] mt-0.5">
                Document: 5900FLX30V2009_SOO_26Mar26_R2 &nbsp;·&nbsp; Revision 2 &nbsp;·&nbsp; 26 March 2026
              </p>
              <p className="text-[11px] text-[#666] mt-1 italic">
                Place the PDF in <span className="font-mono text-[#888]">public/docs/</span> to enable direct download from this page.
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}

function SectionHeader({ label }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-1 h-5 bg-[#E8200C] rounded-full" />
      <h2 className="text-[13px] font-bold text-white tracking-widest uppercase">{label}</h2>
    </div>
  )
}
