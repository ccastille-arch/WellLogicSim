import { useState, useEffect, useRef } from 'react'

// Simulates what Pad Logic does when an operator changes a well's injection setpoint.
// Shows the choke valve responding, flow rate tracking to the new target, and
// how the suction header pressure and other wells react to the redistribution.

const INITIAL_WELLS = [
  { id: 1, name: 'Well 1', sp: 750, flow: 748, choke: 62, color: '#22c55e' },
  { id: 2, name: 'Well 2', sp: 820, flow: 817, choke: 71, color: '#4fc3f7' },
  { id: 3, name: 'Well 3', sp: 680, flow: 678, choke: 55, color: '#f97316' },
  { id: 4, name: 'Well 4', sp: 900, flow: 895, choke: 80, color: '#a78bfa' },
]
const TOTAL_GAS = 3155 // MCFD available from compressors
const SUCTION_TARGET = 145 // PSI

export default function SetpointChangeDemo() {
  const [wells, setWells] = useState(INITIAL_WELLS.map(w => ({ ...w })))
  const [pendingSp, setPendingSp] = useState(null) // { wellId, value }
  const [transitioning, setTransitioning] = useState(false)
  const [suctionPsi, setSuctionPsi] = useState(SUCTION_TARGET)
  const [logLines, setLogLines] = useState([
    { t: '00:00', msg: 'System nominal - all wells on setpoint', type: 'ok' },
  ])
  const [selectedWell, setSelectedWell] = useState(1)
  const [newSp, setNewSp] = useState(750)
  const [tick, setTick] = useState(0)
  const rafRef = useRef(null)
  const startRef = useRef(null)

  const addLog = (msg, type = 'ok') => {
    const now = new Date()
    const t = `${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`
    setLogLines(l => [...l.slice(-19), { t, msg, type }])
  }

  // Gentle idle oscillation
  useEffect(() => {
    if (transitioning) return
    const id = setInterval(() => {
      setWells(ws => ws.map(w => ({
        ...w,
        flow: w.sp + (Math.random() - 0.5) * 6,
        choke: w.choke + (Math.random() - 0.5) * 0.4,
      })))
      setSuctionPsi(p => SUCTION_TARGET + (Math.random() - 0.5) * 2)
    }, 800)
    return () => clearInterval(id)
  }, [transitioning])

  // Transition animation when setpoint changes
  useEffect(() => {
    if (!pendingSp) return
    setTransitioning(true)
    startRef.current = performance.now()

    const DURATION = 4000 // 4s to settle
    const target = pendingSp

    const loop = (now) => {
      const elapsed = now - startRef.current
      const progress = Math.min(1, elapsed / DURATION)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic

      setWells(ws => {
        const updated = ws.map(w => {
          if (w.id === target.wellId) {
            // This well tracks to the new setpoint
            const targetFlow = target.value
            const targetChoke = Math.min(98, Math.max(10, w.choke + (target.value - w.sp) * 0.08))
            return {
              ...w,
              sp: target.value,
              flow: w.sp + (targetFlow - w.sp) * eased + (Math.random() - 0.5) * 4,
              choke: w.choke + (targetChoke - w.choke) * eased + (Math.random() - 0.5) * 0.5,
            }
          }
          // Other wells: slight redistribution to compensate
          const delta = (target.value - ws.find(x => x.id === target.wellId).sp) / (ws.length - 1)
          const adjustedSp = Math.max(300, w.sp - delta * 0.3)
          return {
            ...w,
            flow: w.flow + (adjustedSp - w.flow) * eased * 0.15 + (Math.random() - 0.5) * 4,
          }
        })
        return updated
      })

      // Suction pressure responds transiently
      const transientDip = Math.sin(progress * Math.PI) * 4
      setSuctionPsi(SUCTION_TARGET - transientDip * (target.value > wells.find(w=>w.id===target.wellId).sp ? 1 : -0.5))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(loop)
      } else {
        setTransitioning(false)
        setPendingSp(null)
        addLog(`W${target.wellId} settled at ${target.value} MCFD - system re-balanced`, 'ok')
      }
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [pendingSp])

  const handleApplySetpoint = () => {
    const well = wells.find(w => w.id === selectedWell)
    if (newSp === well.sp) { addLog('Setpoint unchanged - no action taken', 'info'); return }
    const dir = newSp > well.sp ? 'UP' : 'DOWN'
    addLog(`Operator changed W${selectedWell} setpoint ${well.sp} -> ${newSp} MCFD ${dir}`, 'change')
    setTimeout(() => addLog(`Pad Logic adjusting W${selectedWell} choke valve...`, 'info'), 400)
    setTimeout(() => addLog(`Suction header rebalancing across all wells`, 'info'), 900)
    setPendingSp({ wellId: selectedWell, value: newSp })
  }

  const handleReset = () => {
    cancelAnimationFrame(rafRef.current)
    setWells(INITIAL_WELLS.map(w => ({ ...w })))
    setPendingSp(null)
    setTransitioning(false)
    setSuctionPsi(SUCTION_TARGET)
    setLogLines([{ t: '00:00', msg: 'System reset - all wells on original setpoints', type: 'ok' }])
    setNewSp(wells.find(w => w.id === selectedWell)?.sp || 750)
  }

  const totalFlow = wells.reduce((s, w) => s + w.flow, 0)
  const selWell = wells.find(w => w.id === selectedWell)

  return (
    <div className="p-4 h-full flex flex-col gap-4 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white" style={{ fontFamily: "'Arial Black'" }}>
            Setpoint Change Simulation
          </h2>
          <p className="text-[10px] text-[#888] mt-0.5">
            Change a well's injection setpoint and watch Pad Logic redistribute gas in real time
          </p>
        </div>
        <button onClick={handleReset}
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-[#888] border border-[#333] hover:text-white transition">
          Reset
        </button>
      </div>

      {/* Well status grid */}
      <div className="grid grid-cols-4 gap-3">
        {wells.map(w => {
          const onTarget = Math.abs(w.flow - w.sp) < 15
          const pct = Math.min(100, (w.flow / w.sp) * 100)
          return (
            <div key={w.id}
              onClick={() => { setSelectedWell(w.id); setNewSp(Math.round(w.sp)) }}
              className={`rounded-xl border p-3 cursor-pointer transition-all ${selectedWell === w.id ? 'border-[#E8200C]' : 'border-[#1e1e2e] hover:border-[#333]'}`}
              style={{ background: selectedWell === w.id ? '#120508' : '#0e0e1a' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold" style={{ color: w.color }}>{w.name}</span>
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${onTarget ? 'bg-green-950 text-green-400' : 'bg-yellow-950 text-yellow-400'}`}>
                  {onTarget ? 'ON SP' : 'TRACKING'}
                </span>
              </div>

              {/* Flow bar */}
              <div className="w-full bg-[#1a1a2a] rounded h-1.5 overflow-hidden mb-2">
                <div className="h-full rounded transition-all duration-300" style={{ width: `${pct}%`, background: w.color }} />
              </div>

              <div className="grid grid-cols-2 gap-1 text-[9px]">
                <div>
                  <div className="text-[#555]">FLOW</div>
                  <div className="font-bold" style={{ color: w.color }}>{Math.round(w.flow)}</div>
                </div>
                <div>
                  <div className="text-[#555]">SP</div>
                  <div className="text-white font-bold">{Math.round(w.sp)}</div>
                </div>
                <div>
                  <div className="text-[#555]">CHOKE</div>
                  <div className="text-[#aaa]">{Math.round(w.choke)}%</div>
                </div>
                <div>
                  <div className="text-[#555]">DELTA</div>
                  <div className={Math.abs(w.flow - w.sp) < 15 ? 'text-green-400' : 'text-yellow-400'}>
                    {w.flow - w.sp > 0 ? '+' : ''}{Math.round(w.flow - w.sp)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Header + control row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Suction pressure */}
        <div className="rounded-xl border border-[#1e1e2e] p-3" style={{ background: '#0e0e1a' }}>
          <div className="text-[9px] text-[#555] uppercase tracking-wider mb-1">Suction Header</div>
          <div className="text-2xl font-bold text-white" style={{ fontFamily: "'Arial Black'" }}>
            {suctionPsi.toFixed(1)} <span className="text-sm font-normal text-[#666]">PSI</span>
          </div>
          <div className="w-full bg-[#1a1a2a] rounded h-1.5 overflow-hidden mt-2">
            <div className="h-full rounded transition-all duration-500"
              style={{ width: `${Math.min(100,(suctionPsi/200)*100)}%`, background: Math.abs(suctionPsi - SUCTION_TARGET) < 5 ? '#22c55e' : '#eab308' }} />
          </div>
          <div className="text-[8px] text-[#555] mt-1">target {SUCTION_TARGET} PSI</div>
        </div>

        {/* Total flow */}
        <div className="rounded-xl border border-[#1e1e2e] p-3" style={{ background: '#0e0e1a' }}>
          <div className="text-[9px] text-[#555] uppercase tracking-wider mb-1">Total Injection</div>
          <div className="text-2xl font-bold text-white" style={{ fontFamily: "'Arial Black'" }}>
            {Math.round(totalFlow)} <span className="text-sm font-normal text-[#666]">MCFD</span>
          </div>
          <div className="w-full bg-[#1a1a2a] rounded h-1.5 overflow-hidden mt-2">
            <div className="h-full rounded bg-[#4fc3f7] transition-all duration-300"
              style={{ width: `${Math.min(100,(totalFlow/TOTAL_GAS)*100)}%` }} />
          </div>
          <div className="text-[8px] text-[#555] mt-1">of {TOTAL_GAS} MCFD available</div>
        </div>

        {/* Status */}
        <div className="rounded-xl border border-[#1e1e2e] p-3" style={{ background: '#0e0e1a' }}>
          <div className="text-[9px] text-[#555] uppercase tracking-wider mb-1">Controller</div>
          <div className={`text-sm font-bold mb-1 ${transitioning ? 'text-yellow-400' : 'text-green-400'}`}>
            {transitioning ? 'ADJUSTING' : 'STABLE'}
          </div>
          <div className="text-[9px] text-[#666]">
            {transitioning
              ? `W${pendingSp?.wellId} tracking new setpoint...`
              : 'All wells within 2% of setpoint'}
          </div>
        </div>
      </div>

      {/* Setpoint control + log */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {/* Setpoint editor */}
        <div className="rounded-xl border border-[#1e1e2e] p-4 flex flex-col gap-3" style={{ background: '#0e0e1a' }}>
          <div className="text-[10px] text-[#888] font-bold uppercase tracking-widest">Change Setpoint</div>

          <div>
            <label className="text-[9px] text-[#555] block mb-1">Select Well</label>
            <div className="flex gap-1.5">
              {wells.map(w => (
                <button key={w.id} onClick={() => { setSelectedWell(w.id); setNewSp(Math.round(w.sp)) }}
                  className="flex-1 py-1.5 rounded text-[10px] font-bold transition-all"
                  style={{
                    background: selectedWell === w.id ? w.color + '22' : '#080810',
                    border: `1px solid ${selectedWell === w.id ? w.color : '#2a2a3a'}`,
                    color: selectedWell === w.id ? w.color : '#666',
                  }}>
                  W{w.id}
                </button>
              ))}
            </div>
          </div>

          {selWell && (
            <>
              <div>
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="text-[#555]">Current SP: <span className="text-white">{Math.round(selWell.sp)} MCFD</span></span>
                  <span className="text-[#555]">New SP: <span style={{ color: selWell.color }}>{newSp} MCFD</span></span>
                </div>
                <input type="range" min={200} max={1400} step={10} value={newSp}
                  onChange={e => setNewSp(+e.target.value)}
                  className="w-full accent-red-600" />
                <div className="flex justify-between text-[8px] text-[#444] mt-0.5">
                  <span>200</span><span>800</span><span>1400</span>
                </div>
              </div>

              <div className="rounded-lg p-3 text-[10px]" style={{ background: '#080810', border: '1px solid #1a1a2a' }}>
                <div className="flex justify-between mb-1">
                  <span className="text-[#666]">Change</span>
                  <span className={newSp > selWell.sp ? 'text-green-400' : newSp < selWell.sp ? 'text-red-400' : 'text-[#666]'}>
                    {newSp > selWell.sp ? '+' : ''}{newSp - Math.round(selWell.sp)} MCFD
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Choke estimate</span>
                  <span className="text-[#aaa]">{Math.min(98, Math.max(10, Math.round(selWell.choke + (newSp - selWell.sp) * 0.08)))}%</span>
                </div>
              </div>

              <button onClick={handleApplySetpoint} disabled={transitioning}
                className="w-full py-2.5 rounded-xl text-[11px] font-bold text-white transition-all disabled:opacity-40"
                style={{ background: transitioning ? '#1a1a2a' : '#E8200C' }}>
                {transitioning ? 'System adjusting...' : `Apply Setpoint -> ${newSp} MCFD`}
              </button>
            </>
          )}
        </div>

        {/* Event log */}
        <div className="rounded-xl border border-[#1e1e2e] p-4 flex flex-col" style={{ background: '#0e0e1a' }}>
          <div className="text-[10px] text-[#888] font-bold uppercase tracking-widest mb-3">Event Log</div>
          <div className="flex-1 overflow-auto space-y-1.5">
            {logLines.map((ln, i) => (
              <div key={i} className="flex gap-2 text-[10px]">
                <span className="text-[#444] shrink-0 font-mono">{ln.t}</span>
                <span className={
                  ln.type === 'change' ? 'text-yellow-300' :
                  ln.type === 'info' ? 'text-[#4fc3f7]' :
                  ln.type === 'err' ? 'text-red-400' : 'text-green-400'
                }>{ln.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

