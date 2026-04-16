// Commissioning Setup Page
// All configurable parameters from the Pad Optimization Panel Program spec
// Organized by document section with live calculated values shown

export default function CommissioningPage({ state, onFieldChange, onCompressorCapacity }) {
  return (
    <div className="flex-1 overflow-auto bg-[#0e0e14] p-5">
      <div className="max-w-[850px] mx-auto">
        <h1 className="text-lg text-white font-bold mb-1" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
          Commissioning Setup
        </h1>
        <p className="text-[11px] text-[#888] mb-6">
          Pad Optimization Panel configuration. All values are written to ASC compressor controllers via Modbus.
        </p>

        <Section number="" title="Site Equipment Configuration">
          <div className="grid grid-cols-2 gap-3">
            <ParamInput
              label="Compressor Max Flow Rate"
              value={state.compressors[0]?.capacityMcfd ?? 0}
              unit="MCFD per compressor"
              onChange={v => state.compressors.forEach(c => onCompressorCapacity?.(c.id, v))}
              min={100}
              max={4000}
              step={50}
              description="Updates every compressor's max flow rate in the running simulator"
            />
          </div>
          <div className="mt-3 bg-[#12121a] rounded border border-[#2a2a3a] p-3">
            <div className="text-[9px] text-[#f97316] uppercase tracking-wider font-bold mb-2">LIVE CAPACITY</div>
            <div className="text-[11px] text-[#ccc]">
              Online compressors: <span className="text-white font-bold">
                {state.compressors.filter(c => c.status === 'running' || c.status === 'locked_out_running').length}
              </span>
            </div>
            <div className="text-[11px] text-[#ccc]">
              Total available gas: <span className="text-white font-bold">{state.totalAvailableGas.toFixed(0)} MCFD</span>
            </div>
            <div className="text-[11px] text-[#ccc]">
              Installed compressor capacity: <span className="text-white font-bold">{state.maxGasCapacity.toFixed(0)} MCFD</span>
            </div>
          </div>
        </Section>

        {/* ═══════ Section 1: Suction Header Target Pressure ═══════ */}
        <Section number="1" title="Suction Header Target Pressure">
          <p className="text-[11px] text-[#999] mb-3">
            System continuously monitors suction header pressure and maintains it at target. Upper range allows temporary overshoot during restart, unload, or imbalance events. Lower range determines compressor suction slowdown setpoints.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ParamInput
              label="Suction Header Target Pressure"
              value={state.suctionTarget}
              unit="PSI"
              onChange={v => onFieldChange('suctionTarget', v)}
              min={20} max={200}
            />
            <ParamInput
              label="Suction Header High Range"
              value={state.suctionHighRange}
              unit="PSI above target"
              onChange={v => onFieldChange('suctionHighRange', v)}
              min={0} max={100}
              description="Max allowable pressure above target"
            />
            <ParamInput
              label="Suction Header Low Range"
              value={state.suctionLowRange}
              unit="PSI"
              onChange={v => onFieldChange('suctionLowRange', v)}
              min={10} max={150}
              description="Used ONLY to calculate compressor slowdown SP"
            />
            <ParamInput
              label="Compressor Stagger Offset"
              value={state.staggerOffset}
              unit="PSI"
              onChange={v => onFieldChange('staggerOffset', v)}
              min={0} max={20} step={0.5}
              description="Offset between compressor suction SPs to prevent hunting"
            />
          </div>
          {/* Live calculated values */}
          <div className="mt-3 bg-[#12121a] rounded border border-[#2a2a3a] p-3">
            <div className="text-[9px] text-[#f97316] uppercase tracking-wider font-bold mb-2">LIVE CALCULATED VALUES</div>
            <div className="text-[11px] text-[#ccc]">
              Upper Limit = {(state.suctionTarget + state.suctionHighRange).toFixed(0)} PSI (Target + High Range)
            </div>
            <div className="text-[11px] text-[#ccc]">
              Current Suction Header = <span className="text-[#f97316] font-bold">{state.suctionHeaderPressure.toFixed(1)} PSI</span>
            </div>
          </div>
        </Section>

        {/* ═══════ Section 2A: Speed Auto Suction SP ═══════ */}
        <Section number="2A" title="Speed Auto Suction SP">
          <p className="text-[11px] text-[#999] mb-3">
            Defines suction pressure where each compressor begins slowing down to prevent low suction shutdown.
            Stagger offset prevents all compressors reacting at the same pressure and creating system hunting.
          </p>
          <div className="bg-[#12121a] rounded border border-[#2a2a3a] p-3">
            <div className="text-[9px] text-[#f97316] uppercase tracking-wider font-bold mb-2">CALCULATED PER COMPRESSOR</div>
            <div className="text-[11px] text-[#ccc] mb-2">
              Base SP = (Low Range) + 2 = {(state.suctionLowRange + 2).toFixed(0)} PSI
            </div>
            {state.compressors.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between py-1 border-b border-[#1a1a2a] last:border-0">
                <span className="text-[11px] text-[#aaa]">{c.name} Speed Auto Suction SP</span>
                <span className="text-[12px] text-white font-bold">
                  {(state.suctionLowRange + 2 + i * state.staggerOffset).toFixed(1)} PSI
                </span>
                {i > 0 && <span className="text-[9px] text-[#666] ml-2">(+{(i * state.staggerOffset).toFixed(1)} stagger)</span>}
              </div>
            ))}
          </div>
        </Section>

        {/* ═══════ Section 2B: Speed Auto Discharge SP ═══════ */}
        <Section number="2B" title="Speed Auto Discharge SP">
          <p className="text-[11px] text-[#999] mb-3">
            Defines discharge pressure where compressor begins slowing down. Calculated from high discharge shutdown pressure minus the slowdown offset.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ParamInput
              label="High Discharge Shutdown Pressure"
              value={state.dischargeShutdownPressure}
              unit="PSI"
              onChange={v => onFieldChange('dischargeShutdownPressure', v)}
              min={200} max={1200}
              description="Compressor high discharge trip point"
            />
            <ParamInput
              label="Discharge Slowdown Offset"
              value={state.dischargeSlowdownOffset}
              unit="PSI"
              onChange={v => onFieldChange('dischargeSlowdownOffset', v)}
              min={10} max={200}
              description="How far below shutdown to begin slowing"
            />
          </div>
          <div className="mt-3 bg-[#12121a] rounded border border-[#2a2a3a] p-3">
            <div className="text-[9px] text-[#f97316] uppercase tracking-wider font-bold mb-2">CALCULATED VALUE</div>
            <div className="text-[11px] text-[#ccc]">
              Speed Auto Discharge SP = {state.dischargeShutdownPressure} − {state.dischargeSlowdownOffset} = <span className="text-white font-bold">{(state.dischargeShutdownPressure - state.dischargeSlowdownOffset).toFixed(0)} PSI</span>
            </div>
            <div className="text-[10px] text-[#666] mt-1">Written to all compressors</div>
          </div>
        </Section>

        {/* ═══════ Section 2C: Cooler Outlet Auto SP ═══════ */}
        <Section number="2C" title="Cooler Outlet Temperature SP">
          <p className="text-[11px] text-[#999] mb-3">
            Maintains gas as hot as possible without exceeding max temperature at the flow meter plate.
            If flow meter temp exceeds max, cooler outlet SP is lowered.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ParamInput
              label="Max Gas Temperature at Flow Meter Plate"
              value={state.maxTempAtPlate}
              unit="°F"
              onChange={v => onFieldChange('maxTempAtPlate', v)}
              min={100} max={250}
            />
            <ParamInput
              label="Default Cooler Outlet SP"
              value={state.coolerOutletSP}
              unit="°F"
              onChange={v => onFieldChange('coolerOutletSP', v)}
              min={100} max={300}
            />
          </div>
          <div className="mt-3 bg-[#12121a] rounded border border-[#2a2a3a] p-3">
            <div className="text-[9px] text-[#f97316] uppercase tracking-wider font-bold mb-2">LIVE STATUS</div>
            <div className="text-[11px] text-[#ccc]">
              Flow Meter Temperature = <span className={`font-bold ${state.flowMeterTemp > state.maxTempAtPlate ? 'text-[#E8200C]' : 'text-[#22c55e]'}`}>
                {state.flowMeterTemp.toFixed(1)}°F
              </span>
              {state.flowMeterTemp > state.maxTempAtPlate && <span className="text-[#E8200C] text-[10px] ml-2">⚠ EXCEEDS MAX — LOWERING COOLER SP</span>}
            </div>
          </div>
        </Section>

        {/* ═══════ Section 2D: Second Stage Suction Cooler SP ═══════ */}
        <Section number="2D" title="Second Stage Suction Cooler SP">
          <p className="text-[11px] text-[#999] mb-3">
            Background admin setting. Written to compressors to maintain correct interstage cooling.
            Verify with engineering that overwrite does not conflict with Murphy automatic setpoint logic.
          </p>
          <div className="grid grid-cols-1 gap-3 max-w-[400px]">
            <ParamInput
              label="Second Stage Suction Cooler SP"
              value={200}
              unit="°F"
              onChange={() => {}}
              min={100} max={300}
              description="Written to compressors (default 200°F)"
            />
          </div>
          <div className="mt-2 bg-[#1a1a10] rounded border border-[#3a3a20] p-2">
            <span className="text-[10px] text-[#eab308]">⚠ If Murphy conflict exists: write register once every 24 hours instead of continuous overwrite</span>
          </div>
        </Section>

        {/* ═══════ Section 4A: Well Unload Detection ═══════ */}
        <Section number="4A" title="Well Unload Detection">
          <p className="text-[11px] text-[#999] mb-3">
            Detects rapid pressure spikes at the vertical scrubber caused by well unload events.
            When detected, suction pressure may rise toward upper range and sales valve may open to relieve pressure.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ParamInput
              label="Scrubber Pressure Rate-of-Change Threshold"
              value={state.unloadRateThreshold}
              unit="PSI/sec"
              onChange={v => onFieldChange('unloadRateThreshold', v)}
              min={1} max={20} step={0.5}
              description="Rate threshold for unload detection"
            />
            <ParamInput
              label="Scrubber Pressure Spike Threshold"
              value={state.unloadSpikeThreshold}
              unit="PSI"
              onChange={v => onFieldChange('unloadSpikeThreshold', v)}
              min={5} max={50}
              description="Absolute pressure spike threshold"
            />
          </div>
          <div className="mt-3 bg-[#12121a] rounded border border-[#2a2a3a] p-3">
            <div className="text-[9px] text-[#f97316] uppercase tracking-wider font-bold mb-2">LIVE SCRUBBER STATUS</div>
            <div className="text-[11px] text-[#ccc]">
              Scrubber Pressure = <span className="text-white font-bold">{state.scrubberPressure.toFixed(1)} PSI</span>
            </div>
            <div className="text-[11px] text-[#ccc]">
              Rate of Change = <span className={`font-bold ${Math.abs(state.scrubberRateOfChange) > state.unloadRateThreshold ? 'text-[#E8200C]' : 'text-[#22c55e]'}`}>
                {state.scrubberRateOfChange.toFixed(2)} PSI/sec
              </span>
            </div>
            <div className="text-[11px] mt-1">
              Well Unload: <span className={`font-bold ${state.wellUnloadActive ? 'text-[#E8200C]' : 'text-[#22c55e]'}`}>
                {state.wellUnloadActive ? '⚠ ACTIVE' : 'NONE'}
              </span>
            </div>
          </div>
        </Section>

        {/* ═══════ Section 12: Compressor Staging Timers ═══════ */}
        <Section number="12" title="Compressor Staging Logic">
          <p className="text-[11px] text-[#999] mb-3">
            Controls when compressors are allowed to auto-start. Stability timer requires sustained high suction before starting.
            Lockout timer prevents rapid sequential starts.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ParamInput
              label="Suction Pressure Stability Timer"
              value={state.stabilityTimer}
              unit="seconds"
              onChange={v => onFieldChange('stabilityTimer', v)}
              min={10} max={300}
              description="Suction must exceed upper range for this duration before allowing start"
            />
            <ParamInput
              label="Compressor Staging Lockout Timer"
              value={state.stagingLockoutTimer}
              unit="seconds"
              onChange={v => onFieldChange('stagingLockoutTimer', v)}
              min={60} max={900}
              description="No additional starts allowed for this duration after any compressor start"
            />
          </div>
          <div className="mt-3 bg-[#12121a] rounded border border-[#2a2a3a] p-3">
            <div className="text-[9px] text-[#f97316] uppercase tracking-wider font-bold mb-2">STAGING STATUS</div>
            <div className="text-[11px] text-[#ccc]">
              Staging Lockout Remaining: <span className={`font-bold ${state.stagingLockoutRemaining > 0 ? 'text-[#eab308]' : 'text-[#22c55e]'}`}>
                {state.stagingLockoutRemaining > 0 ? `${state.stagingLockoutRemaining.toFixed(0)}s` : 'CLEAR'}
              </span>
            </div>
          </div>
        </Section>

        {/* ═══════ Section 13: Injection Control ═══════ */}
        <Section number="13" title="Injection Control Clarification">
          <div className="bg-[#12121a] rounded border border-[#2a2a3a] p-3">
            <p className="text-[11px] text-[#ccc]">
              Injection control is through <span className="text-white font-bold">well injection motor valves / choke valves</span> only.
            </p>
            <p className="text-[11px] text-[#ccc] mt-1">
              Compressors are <span className="text-[#E8200C] font-bold">NOT</span> used as injection control devices. No compressor injection logic required.
            </p>
          </div>
        </Section>

        <div className="h-10" />
      </div>
    </div>
  )
}

// ═══════ Reusable Components ═══════

function Section({ number, title, children }) {
  return (
    <div className="mb-6 bg-[#111118] rounded-lg border border-[#222233] p-4">
      <div className="flex items-baseline gap-2 mb-2">
        {number ? (
          <span className="text-[10px] text-[#E8200C] font-bold bg-[#E8200C]/10 px-2 py-0.5 rounded">§{number}</span>
        ) : null}
        <h2 className="text-sm text-white font-bold" style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

function ParamInput({ label, value, unit, onChange, min, max, step = 1, description }) {
  return (
    <div className="bg-[#0a0a14] rounded border border-[#2a2a3a] p-3">
      <label className="block text-[10px] text-[#aaa] uppercase tracking-wider font-bold mb-1">{label}</label>
      {description && <p className="text-[9px] text-[#666] mb-2">{description}</p>}
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={typeof value === 'number' ? value : ''}
          onChange={e => onChange(Number(e.target.value))}
          min={min} max={max} step={step}
          className="w-24 bg-[#1a1a2a] border border-[#333] rounded px-2 py-1.5 text-white text-sm font-bold text-right outline-none focus:border-[#4fc3f7]"
        />
        <span className="text-[10px] text-[#888]">{unit}</span>
      </div>
    </div>
  )
}
