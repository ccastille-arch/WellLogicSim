import { WellLogicCompact } from './WellLogicBrand'

/**
 * Header — Service Compression treatment. Sticky navy bar with SC
 * uppercase nav typography and red CTA accents.
 */
export default function Header({ onReconfigure, tutorialMode, onTutorialToggle, showTutorial }) {
  return (
    <header
      className="flex items-center justify-between px-5 py-3 shrink-0"
      style={{
        minHeight: 56,
        background: '#05233E',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <div className="flex items-center gap-5">
        <WellLogicCompact size={34} />
        <span
          className="hidden sm:inline"
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.55)',
            paddingLeft: 16,
            borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          Pad Logic Simulator
        </span>
      </div>
      <div className="flex items-center gap-3">
        {showTutorial && (
          <button
            onClick={onTutorialToggle}
            className="flex items-center gap-2 transition-colors"
            style={{
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: 2,
              textTransform: 'uppercase',
              padding: '8px 14px',
              borderRadius: 2,
              border: '1px solid',
              cursor: 'pointer',
              background: tutorialMode ? '#D32028' : 'transparent',
              borderColor: tutorialMode ? '#D32028' : 'rgba(255, 255, 255, 0.25)',
              color: tutorialMode ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
            }}
            onMouseEnter={e => {
              if (!tutorialMode) {
                e.currentTarget.style.borderColor = '#49D0E2'
                e.currentTarget.style.color = '#49D0E2'
              }
            }}
            onMouseLeave={e => {
              if (!tutorialMode) {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)'
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)'
              }
            }}
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
            className="sc-btn-ghost"
            style={{ padding: '8px 18px', fontSize: 11, letterSpacing: 2 }}
          >
            Reconfigure
          </button>
        )}
        <span
          className="hidden md:inline"
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 600,
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.4)',
          }}
        >
          Service Compression
        </span>
      </div>
    </header>
  )
}
