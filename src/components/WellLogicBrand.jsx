/**
 * Well Logic brand lockup — SC-aligned, vector, self-contained.
 *
 * Replaces the prior pad-logic-logo.png bitmap with a vector mark that
 * meets the SC brand kit (navy #05233E surface, red #D32028 accent,
 * cyan #49D0E2 sub-accent, Montserrat ExtraBold wordmark, 2px-track
 * uppercase tagline). Two variants:
 *   - <WellLogicLogo>     full horizontal lockup: hex mark + wordmark
 *                         + tagline ("THE NIGHT CREW…")
 *   - <WellLogicCompact>  mark + condensed wordmark for app chrome
 *
 * Everything renders inline so it scales without loss, themes via
 * currentColor, and never ships a bitmap the user has to re-produce.
 */

const RED = '#D32028'
const CYAN = '#49D0E2'

/**
 * Hex glyph with a stylized well symbol (casing + pad base + gas-lift
 * injection tick). Reads at a glance as "oilfield hardware", not a
 * generic tech icon. Drawn on a 96×96 grid so it composes cleanly at
 * any display size.
 */
function HexMark({ size = 96 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      aria-hidden="true"
      role="img"
      style={{ flex: 'none', display: 'block' }}
    >
      {/* Outer hex — nods to the SC hex-bolt pattern */}
      <polygon
        points="48,4 86,24 86,72 48,92 10,72 10,24"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Inner translucent red field */}
      <polygon
        points="48,14 78,30 78,66 48,82 18,66 18,30"
        fill={RED}
        fillOpacity="0.14"
        stroke={RED}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Well casing — vertical red line, white cap */}
      <line
        x1="48"
        y1="22"
        x2="48"
        y2="66"
        stroke={RED}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <circle cx="48" cy="21" r="3.5" fill="#FFFFFF" />
      {/* Pad base — cyan bar (FieldTune sub-brand accent) */}
      <line
        x1="30"
        y1="68"
        x2="66"
        y2="68"
        stroke={CYAN}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Gas-lift injection tick */}
      <line
        x1="58"
        y1="40"
        x2="72"
        y2="40"
        stroke={CYAN}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <polygon points="70,37 76,40 70,43" fill={CYAN} />
    </svg>
  )
}

export function WellLogicLogo({ size = 160, showTagline = true }) {
  const markSize = Math.round(size * 0.95)
  const wordFont = Math.round(size * 0.3)
  const taglineFont = Math.max(8, Math.round(size * 0.075))

  return (
    <div
      className="inline-flex items-center"
      style={{ gap: Math.round(size * 0.16) }}
      role="img"
      aria-label="Well Logic"
    >
      <HexMark size={markSize} />
      <div className="leading-none">
        <div
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 800,
            fontSize: wordFont,
            letterSpacing: '-0.5px',
            color: '#FFFFFF',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          Well&nbsp;Logic
          <sup
            style={{
              fontSize: '0.38em',
              fontWeight: 600,
              marginLeft: 2,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: 0,
            }}
          >
            ™
          </sup>
        </div>
        {showTagline && (
          <div
            style={{
              marginTop: Math.round(size * 0.06),
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 600,
              fontSize: taglineFont,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: CYAN,
              whiteSpace: 'nowrap',
            }}
          >
            The Night Crew That Never Goes Home
          </div>
        )}
      </div>
    </div>
  )
}

export function WellLogicCompact({ size = 38 }) {
  const markSize = Math.round(size * 1.1)
  return (
    <div
      className="inline-flex items-center"
      style={{ gap: 10 }}
      role="img"
      aria-label="Well Logic"
    >
      <HexMark size={markSize} />
      <div className="leading-none">
        <div
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 800,
            fontSize: Math.max(13, Math.round(size * 0.42)),
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: '#FFFFFF',
            lineHeight: 1,
          }}
        >
          Well&nbsp;Logic
        </div>
        <div
          style={{
            marginTop: 3,
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 600,
            fontSize: 7,
            letterSpacing: 2.2,
            textTransform: 'uppercase',
            color: CYAN,
            lineHeight: 1,
          }}
        >
          The Night Crew That Never Goes Home
        </div>
      </div>
    </div>
  )
}

export default WellLogicLogo
