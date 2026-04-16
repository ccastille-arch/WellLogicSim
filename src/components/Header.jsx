import { WellLogicCompact } from './WellLogicBrand'

export default function Header({ onReconfigure, tutorialMode, onTutorialToggle, showTutorial }) {
  return (
    <header className="flex items-center justify-between px-5 py-2.5 bg-sc-dark border-b border-sc-charcoal-light shrink-0"
      style={{ minHeight: 48 }}>
      <div className="flex items-center gap-4">
        <WellLogicCompact size={34} />
        <span className="text-sm text-sc-light tracking-wide"
          style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}>
          Pad Logic Simulator
        </span>
      </div>
      <div className="flex items-center gap-3">
        {showTutorial && (
          <button
            onClick={onTutorialToggle}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1.5 ${
              tutorialMode
                ? 'bg-[#E8200C] text-white border border-[#E8200C]'
                : 'text-sc-light border border-sc-charcoal-light hover:border-[#4fc3f7] hover:text-[#4fc3f7]'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9 9a3 3 0 1 1 2.83 4H12v2" />
              <circle cx="12" cy="19" r="0.5" fill="currentColor" />
            </svg>
            {tutorialMode ? 'Exit Tutorial' : 'Tutorial'}
          </button>
        )}
        {onReconfigure && (
          <button
            onClick={onReconfigure}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-sc-light border border-sc-charcoal-light rounded hover:border-sc-red hover:text-white transition-colors"
          >
            Reconfigure
          </button>
        )}
        <span className="text-[10px] text-sc-gray uppercase tracking-widest">
          Service Compression
        </span>
      </div>
    </header>
  )
}
