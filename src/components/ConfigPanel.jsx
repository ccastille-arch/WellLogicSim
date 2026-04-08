import { useState } from 'react'

export default function ConfigPanel({ onLaunch }) {
  const [compressorCount, setCompressorCount] = useState(3)
  const [wellCount, setWellCount] = useState(6)
  const [siteType, setSiteType] = useState('greenfield')

  const handleLaunch = () => {
    onLaunch({ compressorCount, wellCount, siteType })
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="bg-sc-dark border border-sc-charcoal-light rounded-lg p-10 w-[480px] shadow-2xl">
        <h1
          className="text-2xl text-white mb-1 tracking-tight"
          style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}
        >
          Site Configuration
        </h1>
        <p className="text-sm text-sc-gray mb-8">
          Configure the simulation parameters before launch.
        </p>

        {/* Compressor Count */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-sc-light mb-2">
            Number of Compressors
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => setCompressorCount(n)}
                className={`flex-1 py-2.5 rounded text-sm font-bold transition-all ${
                  compressorCount === n
                    ? 'bg-sc-red text-white'
                    : 'bg-sc-charcoal text-sc-gray hover:bg-sc-charcoal-light hover:text-white'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Well Count */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-sc-light mb-2">
            Number of Wells
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={10}
              value={wellCount}
              onChange={e => setWellCount(Number(e.target.value))}
              className="flex-1 accent-sc-red"
            />
            <span className="text-lg font-bold text-white w-8 text-center">{wellCount}</span>
          </div>
        </div>

        {/* Site Type */}
        <div className="mb-8">
          <label className="block text-xs font-bold uppercase tracking-wider text-sc-light mb-2">
            Site Type
          </label>
          <div className="flex gap-2">
            {[
              { value: 'greenfield', label: 'Greenfield', desc: 'Standard WellLogic — electronic choke control' },
              { value: 'brownfield', label: 'Brownfield', desc: 'Recycled gas — suction controller prioritization' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setSiteType(opt.value)}
                className={`flex-1 py-3 px-3 rounded text-left transition-all border ${
                  siteType === opt.value
                    ? 'border-sc-red bg-sc-red/10'
                    : 'border-sc-charcoal-light bg-sc-charcoal hover:border-sc-gray'
                }`}
              >
                <div className={`text-sm font-bold mb-0.5 ${siteType === opt.value ? 'text-white' : 'text-sc-light'}`}>
                  {opt.label}
                </div>
                <div className="text-[11px] text-sc-gray leading-tight">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Launch Button */}
        <button
          onClick={handleLaunch}
          className="w-full py-3 bg-sc-red hover:bg-sc-red-dark text-white font-bold rounded text-sm uppercase tracking-wider transition-colors"
        >
          Launch Simulator
        </button>
      </div>
    </div>
  )
}
