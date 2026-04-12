// ═══════════════════════════════════════════════════════════════
// FIELDTUNE™ / WELLLOGIC™ PREMIUM BRAND LOGOS
// Designed to match Service Compression "SC" brand identity:
//   - Italic/slanted dynamic lettering
//   - Speed lines / racing stripes
//   - Bold red (#E8200C) primary
//   - Professional oilfield-tech aesthetic
// Admin selects which logo is active across the app
// ═══════════════════════════════════════════════════════════════

// Shared SC speed-line mark used across all logos
function SCMark({ x, y, scale = 1, opacity = 1 }) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} opacity={opacity}>
      {/* S */}
      <path d="M0 0 L28 0 L26 4 L8 4 L6 8 L24 8 L18 20 L-10 20 L-8 16 L10 16 L12 12 L-6 12 Z"
        fill="#E8200C" transform="skewX(-12)" />
      {/* Speed lines through S */}
      <line x1="2" y1="6" x2="14" y2="6" stroke="white" strokeWidth="0.8" opacity="0.5" transform="skewX(-12)" />
      <line x1="1" y1="9" x2="13" y2="9" stroke="white" strokeWidth="0.6" opacity="0.35" transform="skewX(-12)" />
      {/* C */}
      <path d="M30 0 L58 0 L56 4 L36 4 L30 20 L52 20 L50 24 L22 24 Z"
        fill="#E8200C" transform="skewX(-12)" />
    </g>
  )
}

// ─── LOGO 1: "THE HERITAGE" ────────────────────────────────────
// The SC mark sits bold and centered above stacked FieldTune / WellLogic
// typography. Speed-line accents frame the composition. Classic and authoritative.
export function HeritageLogo({ size = 200 }) {
  const s = size / 200
  return (
    <svg width={200 * s} height={230 * s} viewBox="0 0 200 230" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer border frame */}
      <rect x="8" y="8" width="184" height="214" rx="4" stroke="#1a1a2a" strokeWidth="1" />
      <rect x="12" y="12" width="176" height="206" rx="3" stroke="#E8200C" strokeWidth="1.5" />

      {/* Corner accents */}
      <line x1="12" y1="30" x2="30" y2="12" stroke="#c8943e" strokeWidth="0.5" opacity="0.4" />
      <line x1="170" y1="12" x2="188" y2="30" stroke="#c8943e" strokeWidth="0.5" opacity="0.4" />
      <line x1="12" y1="200" x2="30" y2="218" stroke="#c8943e" strokeWidth="0.5" opacity="0.4" />
      <line x1="170" y1="218" x2="188" y2="200" stroke="#c8943e" strokeWidth="0.5" opacity="0.4" />

      {/* SC Mark — large, centered */}
      <g transform="translate(42, 28) scale(1.8)">
        {/* S */}
        <path d="M0 0 L28 0 L26 4 L8 4 L6 8 L24 8 L18 20 L-10 20 L-8 16 L10 16 L12 12 L-6 12 Z"
          fill="#E8200C" transform="skewX(-12)" />
        <line x1="2" y1="6" x2="14" y2="6" stroke="white" strokeWidth="0.8" opacity="0.5" transform="skewX(-12)" />
        <line x1="1" y1="9" x2="13" y2="9" stroke="white" strokeWidth="0.6" opacity="0.35" transform="skewX(-12)" />
        <line x1="0" y1="14" x2="12" y2="14" stroke="white" strokeWidth="0.6" opacity="0.3" transform="skewX(-12)" />
        {/* C */}
        <path d="M30 0 L58 0 L56 4 L36 4 L30 20 L52 20 L50 24 L22 24 Z"
          fill="#E8200C" transform="skewX(-12)" />
      </g>

      {/* Speed lines extending from SC mark */}
      <line x1="20" y1="72" x2="70" y2="72" stroke="#E8200C" strokeWidth="2" opacity="0.4" />
      <line x1="20" y1="76" x2="55" y2="76" stroke="#E8200C" strokeWidth="1.2" opacity="0.25" />
      <line x1="130" y1="72" x2="180" y2="72" stroke="#E8200C" strokeWidth="2" opacity="0.4" />
      <line x1="145" y1="76" x2="180" y2="76" stroke="#E8200C" strokeWidth="1.2" opacity="0.25" />

      {/* Divider */}
      <line x1="30" y1="90" x2="170" y2="90" stroke="#E8200C" strokeWidth="1" />
      <line x1="50" y1="93" x2="150" y2="93" stroke="#c8943e" strokeWidth="0.5" opacity="0.4" />

      {/* SERVICE COMPRESSION text */}
      <text x="100" y="108" textAnchor="middle" fill="#c8943e" fontSize="7" letterSpacing="4.5"
        fontFamily="'Georgia', 'Times New Roman', serif" opacity="0.7">SERVICE COMPRESSION</text>

      {/* FIELDTUNE — large italic */}
      <text x="100" y="136" textAnchor="middle" fill="#E8200C" fontSize="26" fontWeight="900"
        fontFamily="'Arial Black', 'Helvetica', sans-serif" fontStyle="italic" letterSpacing="2">FIELDTUNE</text>
      {/* TM */}
      <text x="172" y="122" fill="#E8200C" fontSize="6" fontFamily="'Arial', sans-serif" opacity="0.7">™</text>

      {/* Accent speed lines under FIELDTUNE */}
      <line x1="28" y1="142" x2="172" y2="142" stroke="#E8200C" strokeWidth="2.5" />
      <line x1="40" y1="146" x2="160" y2="146" stroke="#E8200C" strokeWidth="1" opacity="0.4" />
      <line x1="55" y1="149" x2="145" y2="149" stroke="#E8200C" strokeWidth="0.5" opacity="0.25" />

      {/* Presents */}
      <text x="100" y="163" textAnchor="middle" fill="#555" fontSize="5.5" letterSpacing="3"
        fontFamily="'Georgia', serif">PRESENTS</text>

      {/* WELLLOGIC */}
      <text x="100" y="182" textAnchor="middle" fill="white" fontSize="18" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="3">WELLLOGIC</text>
      <text x="178" y="172" fill="white" fontSize="5" fontFamily="'Arial', sans-serif" opacity="0.5">™</text>

      {/* Tagline */}
      <text x="100" y="200" textAnchor="middle" fill="#888" fontSize="5.5" letterSpacing="2"
        fontFamily="'Georgia', serif">AUTOMATED GAS LIFT INJECTION OPTIMIZATION</text>

      {/* Bottom flourish */}
      <line x1="70" y1="210" x2="130" y2="210" stroke="#c8943e" strokeWidth="0.5" opacity="0.4" />
      <circle cx="100" cy="210" r="1.5" fill="#c8943e" opacity="0.4" />
    </svg>
  )
}

// ─── LOGO 2: "THE TECHNICAL" ───────────────────────────────────
// Badge/shield format. SC mark at top, angular shield shape,
// speed lines integrated into the structure. Engineering precision.
export function TechnicalLogo({ size = 200 }) {
  const s = size / 200
  return (
    <svg width={200 * s} height={240 * s} viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shield shape — angular, technical */}
      <path d="M100 6 L186 36 L186 110 L172 145 L100 230 L28 145 L14 110 L14 36 Z"
        fill="#0a0a14" stroke="#E8200C" strokeWidth="2.5" />
      <path d="M100 14 L180 42 L180 108 L167 141 L100 222 L33 141 L20 108 L20 42 Z"
        fill="none" stroke="#c8943e" strokeWidth="0.5" opacity="0.35" />

      {/* SC Mark at top of shield */}
      <g transform="translate(52, 30) scale(1.5)">
        <path d="M0 0 L28 0 L26 4 L8 4 L6 8 L24 8 L18 20 L-10 20 L-8 16 L10 16 L12 12 L-6 12 Z"
          fill="#E8200C" transform="skewX(-12)" />
        <line x1="2" y1="6" x2="14" y2="6" stroke="white" strokeWidth="0.8" opacity="0.5" transform="skewX(-12)" />
        <line x1="1" y1="9" x2="13" y2="9" stroke="white" strokeWidth="0.6" opacity="0.35" transform="skewX(-12)" />
        <path d="M30 0 L58 0 L56 4 L36 4 L30 20 L52 20 L50 24 L22 24 Z"
          fill="#E8200C" transform="skewX(-12)" />
      </g>

      {/* Speed lines across shield mid-section */}
      <line x1="22" y1="72" x2="178" y2="72" stroke="#E8200C" strokeWidth="1.5" opacity="0.3" />
      <line x1="28" y1="76" x2="172" y2="76" stroke="#E8200C" strokeWidth="0.8" opacity="0.2" />
      <line x1="34" y1="79" x2="166" y2="79" stroke="#E8200C" strokeWidth="0.5" opacity="0.15" />

      {/* SERVICE COMPRESSION */}
      <text x="100" y="94" textAnchor="middle" fill="#c8943e" fontSize="6" letterSpacing="3.5"
        fontFamily="'Georgia', serif" opacity="0.6">SERVICE COMPRESSION</text>

      {/* Horizontal rule */}
      <line x1="40" y1="100" x2="160" y2="100" stroke="#E8200C" strokeWidth="1" />

      {/* FIELDTUNE */}
      <text x="100" y="124" textAnchor="middle" fill="#E8200C" fontSize="22" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="1.5">FIELDTUNE</text>
      <text x="166" y="112" fill="#E8200C" fontSize="5" fontFamily="'Arial', sans-serif" opacity="0.6">™</text>

      {/* Speed lines under FIELDTUNE */}
      <line x1="35" y1="130" x2="165" y2="130" stroke="#E8200C" strokeWidth="2" />
      <line x1="45" y1="134" x2="155" y2="134" stroke="#E8200C" strokeWidth="0.8" opacity="0.3" />

      {/* Well diagram — 4 dots representing wells */}
      <g opacity="0.7">
        {[60, 80, 120, 140].map(x => (
          <g key={x}>
            <circle cx={x} cy="150" r="4" fill="none" stroke="#22c55e" strokeWidth="1" />
            <circle cx={x} cy="150" r="1.5" fill="#22c55e" />
          </g>
        ))}
        {/* Flow connection line */}
        <path d="M60 150 Q80 142 100 140 Q120 142 140 150" stroke="#c8943e" strokeWidth="0.7" fill="none" opacity="0.5" />
      </g>

      {/* WELLLOGIC */}
      <text x="100" y="175" textAnchor="middle" fill="white" fontSize="14" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="2.5">WELLLOGIC</text>
      <text x="155" y="167" fill="white" fontSize="4" fontFamily="'Arial', sans-serif" opacity="0.4">™</text>

      {/* Tagline */}
      <text x="100" y="192" textAnchor="middle" fill="#888" fontSize="5" letterSpacing="1.5"
        fontFamily="'Georgia', serif">INJECTION OPTIMIZATION</text>

      {/* Bottom of shield — small accent */}
      <circle cx="100" cy="210" r="2" fill="#E8200C" opacity="0.5" />
    </svg>
  )
}

// ─── LOGO 3: "THE MODERN" ──────────────────────────────────────
// Wide horizontal layout. The SC mark on the left, stacked type
// on the right. Bold speed-line underscores. Clean and contemporary.
// Also has a stacked version for vertical display.
export function ModernLogo({ size = 200 }) {
  const s = size / 200
  return (
    <svg width={220 * s} height={200 * s} viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Large SC mark */}
      <g transform="translate(18, 22) scale(2.8)">
        <path d="M0 0 L28 0 L26 4 L8 4 L6 8 L24 8 L18 20 L-10 20 L-8 16 L10 16 L12 12 L-6 12 Z"
          fill="#E8200C" transform="skewX(-12)" />
        <line x1="2" y1="6" x2="14" y2="6" stroke="white" strokeWidth="0.7" opacity="0.5" transform="skewX(-12)" />
        <line x1="1" y1="9" x2="13" y2="9" stroke="white" strokeWidth="0.5" opacity="0.35" transform="skewX(-12)" />
        <line x1="0" y1="14" x2="12" y2="14" stroke="white" strokeWidth="0.5" opacity="0.25" transform="skewX(-12)" />
        <path d="M30 0 L58 0 L56 4 L36 4 L30 20 L52 20 L50 24 L22 24 Z"
          fill="#E8200C" transform="skewX(-12)" />
      </g>

      {/* Vertical divider */}
      <line x1="108" y1="20" x2="108" y2="90" stroke="#E8200C" strokeWidth="1.5" />
      <line x1="111" y1="28" x2="111" y2="82" stroke="#c8943e" strokeWidth="0.5" opacity="0.3" />

      {/* SERVICE COMPRESSION */}
      <text x="118" y="36" fill="#c8943e" fontSize="6" letterSpacing="2.5"
        fontFamily="'Georgia', serif" opacity="0.7">SERVICE COMPRESSION</text>

      {/* FIELDTUNE */}
      <text x="118" y="58" fill="#E8200C" fontSize="22" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="1">FIELDTUNE</text>
      <text x="216" y="47" fill="#E8200C" fontSize="5" fontFamily="'Arial', sans-serif" opacity="0.6">™</text>

      {/* Speed lines */}
      <line x1="118" y1="64" x2="214" y2="64" stroke="#E8200C" strokeWidth="2" />
      <line x1="118" y1="68" x2="200" y2="68" stroke="#E8200C" strokeWidth="0.8" opacity="0.3" />
      <line x1="118" y1="71" x2="185" y2="71" stroke="#E8200C" strokeWidth="0.5" opacity="0.2" />

      {/* WELLLOGIC */}
      <text x="118" y="86" fill="white" fontSize="12" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="3">WELLLOGIC™</text>

      {/* Full-width speed line divider */}
      <line x1="10" y1="104" x2="210" y2="104" stroke="#E8200C" strokeWidth="3" />
      <line x1="10" y1="109" x2="210" y2="109" stroke="#E8200C" strokeWidth="1" opacity="0.25" />
      <line x1="10" y1="112" x2="210" y2="112" stroke="#E8200C" strokeWidth="0.5" opacity="0.15" />

      {/* Tagline below */}
      <text x="110" y="130" textAnchor="middle" fill="#888" fontSize="6.5" letterSpacing="3"
        fontFamily="'Georgia', serif">AUTOMATED GAS LIFT INJECTION OPTIMIZATION</text>

      {/* Three feature pills */}
      <g transform="translate(0, 145)">
        {[
          { x: 22, label: 'PRIORITY ALLOCATION' },
          { x: 110, label: 'AUTO-STAGING' },
          { x: 198, label: 'ZERO DOWNTIME' },
        ].map(pill => (
          <g key={pill.label}>
            <rect x={pill.x - 38} y="0" width="76" height="16" rx="8" fill="none" stroke="#333" strokeWidth="0.8" />
            <text x={pill.x} y="11" textAnchor="middle" fill="#666" fontSize="4.5" letterSpacing="1.5"
              fontFamily="'Arial', sans-serif">{pill.label}</text>
          </g>
        ))}
      </g>

      {/* Bottom accent bar */}
      <rect x="10" y="178" width="200" height="2" rx="1" fill="#E8200C" opacity="0.15" />
    </svg>
  )
}

// ─── COMPACT LOGOS (for header bar) ────────────────────────────

export function HeritageLogoCompact({ size = 36 }) {
  const s = size / 36
  return (
    <svg width={80 * s} height={36 * s} viewBox="0 0 80 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* SC mark small */}
      <g transform="translate(2, 6) scale(0.6)">
        <path d="M0 0 L28 0 L26 4 L8 4 L6 8 L24 8 L18 20 L-10 20 L-8 16 L10 16 L12 12 L-6 12 Z"
          fill="#E8200C" transform="skewX(-12)" />
        <path d="M30 0 L58 0 L56 4 L36 4 L30 20 L52 20 L50 24 L22 24 Z"
          fill="#E8200C" transform="skewX(-12)" />
      </g>
      {/* Divider */}
      <line x1="32" y1="6" x2="32" y2="30" stroke="#E8200C" strokeWidth="1" />
      {/* FIELDTUNE */}
      <text x="36" y="16" fill="#E8200C" fontSize="9" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="0.5">FIELDTUNE</text>
      {/* WELLLOGIC */}
      <text x="36" y="28" fill="white" fontSize="7" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="1">WELLLOGIC</text>
    </svg>
  )
}

export function TechnicalLogoCompact({ size = 36 }) {
  const s = size / 36
  return (
    <svg width={44 * s} height={44 * s} viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Shield */}
      <path d="M100 6 L186 36 L186 110 L172 145 L100 230 L28 145 L14 110 L14 36 Z"
        fill="#0a0a14" stroke="#E8200C" strokeWidth="6" />
      {/* SC mark */}
      <g transform="translate(52, 40) scale(1.5)">
        <path d="M0 0 L28 0 L26 4 L8 4 L6 8 L24 8 L18 20 L-10 20 L-8 16 L10 16 L12 12 L-6 12 Z"
          fill="#E8200C" transform="skewX(-12)" />
        <path d="M30 0 L58 0 L56 4 L36 4 L30 20 L52 20 L50 24 L22 24 Z"
          fill="#E8200C" transform="skewX(-12)" />
      </g>
      <text x="100" y="120" textAnchor="middle" fill="white" fontSize="26" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="1">FT</text>
      <line x1="40" y1="130" x2="160" y2="130" stroke="#E8200C" strokeWidth="4" />
    </svg>
  )
}

export function ModernLogoCompact({ size = 36 }) {
  const s = size / 36
  return (
    <svg width={80 * s} height={36 * s} viewBox="0 0 80 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* SC mark */}
      <g transform="translate(2, 6) scale(0.6)">
        <path d="M0 0 L28 0 L26 4 L8 4 L6 8 L24 8 L18 20 L-10 20 L-8 16 L10 16 L12 12 L-6 12 Z"
          fill="#E8200C" transform="skewX(-12)" />
        <path d="M30 0 L58 0 L56 4 L36 4 L30 20 L52 20 L50 24 L22 24 Z"
          fill="#E8200C" transform="skewX(-12)" />
      </g>
      {/* Speed line */}
      <line x1="0" y1="22" x2="80" y2="22" stroke="#E8200C" strokeWidth="1.5" />
      <line x1="0" y1="25" x2="60" y2="25" stroke="#E8200C" strokeWidth="0.5" opacity="0.3" />
      {/* FIELDTUNE */}
      <text x="40" y="34" textAnchor="middle" fill="white" fontSize="7" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="1.5">FIELDTUNE</text>
    </svg>
  )
}

// ─── LOGO 4: "THE INDUSTRIAL" ──────────────────────────────────
// Heavy industrial look — thick borders, gear motif, bold stacked type
export function IndustrialLogo({ size = 200 }) {
  const s = size / 200
  return (
    <svg width={200 * s} height={200 * s} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Heavy outer border */}
      <rect x="4" y="4" width="192" height="192" rx="6" stroke="#E8200C" strokeWidth="4" fill="#0a0a14" />
      <rect x="12" y="12" width="176" height="176" rx="3" stroke="#333" strokeWidth="1" />

      {/* Top bar */}
      <rect x="12" y="12" width="176" height="28" rx="3" fill="#E8200C" />
      <text x="100" y="31" textAnchor="middle" fill="white" fontSize="12" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" letterSpacing="6">SERVICE COMPRESSION</text>

      {/* SC Mark centered */}
      <g transform="translate(48, 52) scale(1.6)">
        <path d="M0 0 L28 0 L26 4 L8 4 L6 8 L24 8 L18 20 L-10 20 L-8 16 L10 16 L12 12 L-6 12 Z" fill="#E8200C" transform="skewX(-12)" />
        <line x1="2" y1="6" x2="14" y2="6" stroke="white" strokeWidth="0.8" opacity="0.5" transform="skewX(-12)" />
        <path d="M30 0 L58 0 L56 4 L36 4 L30 20 L52 20 L50 24 L22 24 Z" fill="#E8200C" transform="skewX(-12)" />
      </g>

      {/* FIELDTUNE large */}
      <text x="100" y="112" textAnchor="middle" fill="white" fontSize="28" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="1">FIELDTUNE</text>

      {/* Thick divider */}
      <rect x="20" y="118" width="160" height="4" rx="2" fill="#E8200C" />

      {/* WELLLOGIC */}
      <text x="100" y="145" textAnchor="middle" fill="#c8943e" fontSize="16" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="4">WELLLOGIC</text>

      {/* Tagline */}
      <text x="100" y="165" textAnchor="middle" fill="#666" fontSize="6" letterSpacing="2"
        fontFamily="'Georgia', serif">AUTOMATED GAS LIFT OPTIMIZATION</text>

      {/* Bottom bar */}
      <rect x="12" y="172" width="176" height="16" rx="3" fill="#111120" stroke="#333" strokeWidth="0.5" />
      <text x="100" y="183" textAnchor="middle" fill="#555" fontSize="6" letterSpacing="4"
        fontFamily="'Arial', sans-serif">EST. 2024</text>
    </svg>
  )
}

// ─── LOGO 5: "THE MINIMAL" ─────────────────────────────────────
// Ultra-clean. SC + FIELDTUNE. Nothing else. Premium whitespace.
export function MinimalLogo({ size = 200 }) {
  const s = size / 200
  return (
    <svg width={200 * s} height={160 * s} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* SC Mark — large, centered */}
      <g transform="translate(30, 10) scale(2.2)">
        <path d="M0 0 L28 0 L26 4 L8 4 L6 8 L24 8 L18 20 L-10 20 L-8 16 L10 16 L12 12 L-6 12 Z" fill="#E8200C" transform="skewX(-12)" />
        <line x1="2" y1="6" x2="14" y2="6" stroke="white" strokeWidth="0.7" opacity="0.5" transform="skewX(-12)" />
        <line x1="1" y1="9" x2="13" y2="9" stroke="white" strokeWidth="0.5" opacity="0.3" transform="skewX(-12)" />
        <path d="M30 0 L58 0 L56 4 L36 4 L30 20 L52 20 L50 24 L22 24 Z" fill="#E8200C" transform="skewX(-12)" />
      </g>

      {/* Single thin line */}
      <line x1="30" y1="72" x2="170" y2="72" stroke="#E8200C" strokeWidth="1" />

      {/* FIELDTUNE — elegant italic */}
      <text x="100" y="100" textAnchor="middle" fill="white" fontSize="24" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="3">FIELDTUNE</text>

      {/* Subtle subtitle */}
      <text x="100" y="120" textAnchor="middle" fill="#555" fontSize="7" letterSpacing="5"
        fontFamily="'Georgia', serif">WELLLOGIC</text>

      {/* Single speed line accent */}
      <line x1="60" y1="130" x2="140" y2="130" stroke="#E8200C" strokeWidth="0.5" opacity="0.3" />
    </svg>
  )
}

// ─── LOGO 6: "THE BADGE" ───────────────────────────────────────
// Circular badge/seal with SC at center
export function BadgeLogo({ size = 200 }) {
  const s = size / 200
  return (
    <svg width={200 * s} height={210 * s} viewBox="0 0 200 210" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer circle */}
      <circle cx="100" cy="100" r="94" stroke="#E8200C" strokeWidth="3" fill="#0a0a14" />
      <circle cx="100" cy="100" r="88" stroke="#c8943e" strokeWidth="0.5" opacity="0.4" />
      <circle cx="100" cy="100" r="82" stroke="#333" strokeWidth="0.5" />

      {/* Curved text top */}
      <path id="badge-top" d="M30 100 A70 70 0 0 1 170 100" fill="none" />
      <text fill="#c8943e" fontSize="8.5" fontFamily="'Georgia', serif" letterSpacing="4" fontWeight="bold">
        <textPath href="#badge-top" startOffset="50%" textAnchor="middle">SERVICE COMPRESSION</textPath>
      </text>

      {/* SC Mark center */}
      <g transform="translate(52, 52) scale(1.5)">
        <path d="M0 0 L28 0 L26 4 L8 4 L6 8 L24 8 L18 20 L-10 20 L-8 16 L10 16 L12 12 L-6 12 Z" fill="#E8200C" transform="skewX(-12)" />
        <line x1="2" y1="6" x2="14" y2="6" stroke="white" strokeWidth="0.8" opacity="0.5" transform="skewX(-12)" />
        <path d="M30 0 L58 0 L56 4 L36 4 L30 20 L52 20 L50 24 L22 24 Z" fill="#E8200C" transform="skewX(-12)" />
      </g>

      {/* Speed lines */}
      <line x1="30" y1="100" x2="55" y2="100" stroke="#E8200C" strokeWidth="1.5" opacity="0.4" />
      <line x1="145" y1="100" x2="170" y2="100" stroke="#E8200C" strokeWidth="1.5" opacity="0.4" />

      {/* FIELDTUNE below center */}
      <text x="100" y="116" textAnchor="middle" fill="white" fontSize="15" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="1">FIELDTUNE</text>

      {/* Curved text bottom */}
      <path id="badge-bottom" d="M35 108 A68 68 0 0 0 165 108" fill="none" />
      <text fill="#888" fontSize="7" fontFamily="'Georgia', serif" letterSpacing="3">
        <textPath href="#badge-bottom" startOffset="50%" textAnchor="middle">WELLLOGIC</textPath>
      </text>

      {/* Stars */}
      <circle cx="100" cy="24" r="3" fill="#E8200C" />
      <circle cx="85" cy="26" r="1.5" fill="#c8943e" opacity="0.5" />
      <circle cx="115" cy="26" r="1.5" fill="#c8943e" opacity="0.5" />

      {/* Bottom text outside circle */}
      <text x="100" y="205" textAnchor="middle" fill="#555" fontSize="5.5" letterSpacing="2"
        fontFamily="'Georgia', serif">INJECTION OPTIMIZATION</text>
    </svg>
  )
}

// ─── LOGO 7: "THE RACING" ──────────────────────────────────────
// Full speed-line racing theme — diagonal stripes, aggressive italic
export function RacingLogo({ size = 200 }) {
  const s = size / 200
  return (
    <svg width={220 * s} height={180 * s} viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background parallelogram */}
      <polygon points="20,10 210,10 190,170 0,170" fill="#0a0a14" stroke="#E8200C" strokeWidth="2" />

      {/* Diagonal racing stripes */}
      <line x1="180" y1="10" x2="160" y2="170" stroke="#E8200C" strokeWidth="8" opacity="0.15" />
      <line x1="190" y1="10" x2="170" y2="170" stroke="#E8200C" strokeWidth="4" opacity="0.1" />
      <line x1="196" y1="10" x2="176" y2="170" stroke="#E8200C" strokeWidth="2" opacity="0.08" />

      {/* SC Mark */}
      <g transform="translate(22, 20) scale(1.4)">
        <path d="M0 0 L28 0 L26 4 L8 4 L6 8 L24 8 L18 20 L-10 20 L-8 16 L10 16 L12 12 L-6 12 Z" fill="#E8200C" transform="skewX(-12)" />
        <line x1="2" y1="6" x2="14" y2="6" stroke="white" strokeWidth="0.8" opacity="0.5" transform="skewX(-12)" />
        <path d="M30 0 L58 0 L56 4 L36 4 L30 20 L52 20 L50 24 L22 24 Z" fill="#E8200C" transform="skewX(-12)" />
      </g>

      {/* SERVICE COMPRESSION */}
      <text x="22" y="72" fill="#c8943e" fontSize="6" letterSpacing="2.5" fontFamily="'Georgia', serif" opacity="0.7">SERVICE COMPRESSION</text>

      {/* FIELDTUNE massive italic */}
      <text x="18" y="105" fill="#E8200C" fontSize="36" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="1">FIELDTUNE</text>
      <text x="196" y="88" fill="#E8200C" fontSize="6" fontFamily="'Arial', sans-serif" opacity="0.6">™</text>

      {/* Triple speed lines */}
      <line x1="15" y1="112" x2="200" y2="112" stroke="#E8200C" strokeWidth="3" />
      <line x1="15" y1="118" x2="180" y2="118" stroke="#E8200C" strokeWidth="1.2" opacity="0.3" />
      <line x1="15" y1="122" x2="160" y2="122" stroke="#E8200C" strokeWidth="0.6" opacity="0.15" />

      {/* WELLLOGIC */}
      <text x="18" y="142" fill="white" fontSize="16" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="5">WELLLOGIC™</text>

      {/* Tagline */}
      <text x="18" y="160" fill="#666" fontSize="5.5" letterSpacing="2" fontFamily="'Georgia', serif">AUTOMATED GAS LIFT INJECTION OPTIMIZATION</text>
    </svg>
  )
}

// ─── LOGO 8: "THE EXECUTIVE" ───────────────────────────────────
// Black-tie premium — thin gold accents, serif type, understated SC
export function ExecutiveLogo({ size = 200 }) {
  const s = size / 200
  return (
    <svg width={200 * s} height={190 * s} viewBox="0 0 200 190" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Thin gold border */}
      <rect x="10" y="10" width="180" height="170" stroke="#c8943e" strokeWidth="0.8" fill="none" />
      <rect x="14" y="14" width="172" height="162" stroke="#c8943e" strokeWidth="0.3" fill="none" opacity="0.4" />

      {/* Top ornament */}
      <line x1="60" y1="10" x2="140" y2="10" stroke="#0a0a14" strokeWidth="6" />
      <line x1="70" y1="10" x2="130" y2="10" stroke="#c8943e" strokeWidth="0.5" />
      <circle cx="100" cy="10" r="3" fill="#0a0a14" stroke="#c8943e" strokeWidth="0.5" />

      {/* SERVICE COMPRESSION */}
      <text x="100" y="38" textAnchor="middle" fill="#c8943e" fontSize="6.5" letterSpacing="5"
        fontFamily="'Georgia', 'Times New Roman', serif">SERVICE COMPRESSION</text>

      {/* Thin rule */}
      <line x1="40" y1="46" x2="160" y2="46" stroke="#c8943e" strokeWidth="0.3" />

      {/* Small SC mark */}
      <g transform="translate(68, 54) scale(1.0)">
        <path d="M0 0 L28 0 L26 4 L8 4 L6 8 L24 8 L18 20 L-10 20 L-8 16 L10 16 L12 12 L-6 12 Z" fill="#E8200C" transform="skewX(-12)" />
        <path d="M30 0 L58 0 L56 4 L36 4 L30 20 L52 20 L50 24 L22 24 Z" fill="#E8200C" transform="skewX(-12)" />
      </g>

      {/* Thin rule */}
      <line x1="40" y1="86" x2="160" y2="86" stroke="#c8943e" strokeWidth="0.3" />

      {/* FIELDTUNE */}
      <text x="100" y="112" textAnchor="middle" fill="white" fontSize="24" fontWeight="900"
        fontFamily="'Georgia', 'Times New Roman', serif" fontStyle="italic" letterSpacing="4">FIELDTUNE</text>

      {/* Single red accent */}
      <line x1="60" y1="118" x2="140" y2="118" stroke="#E8200C" strokeWidth="1.5" />

      {/* WELLLOGIC */}
      <text x="100" y="140" textAnchor="middle" fill="#c8943e" fontSize="11" letterSpacing="6"
        fontFamily="'Georgia', serif">WELLLOGIC</text>

      {/* Tagline */}
      <text x="100" y="158" textAnchor="middle" fill="#555" fontSize="5" letterSpacing="2.5"
        fontFamily="'Georgia', serif">AUTOMATED INJECTION OPTIMIZATION</text>

      {/* Bottom ornament */}
      <line x1="60" y1="180" x2="140" y2="180" stroke="#0a0a14" strokeWidth="6" />
      <circle cx="100" cy="180" r="3" fill="#0a0a14" stroke="#c8943e" strokeWidth="0.5" />
    </svg>
  )
}

// ─── LOGO 9: "THE STACKED" ─────────────────────────────────────
// Vertical stack — SC on top, everything aligned center, compact
export function StackedLogo({ size = 200 }) {
  const s = size / 200
  return (
    <svg width={160 * s} height={210 * s} viewBox="0 0 160 210" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* SC Mark centered */}
      <g transform="translate(24, 8) scale(1.8)">
        <path d="M0 0 L28 0 L26 4 L8 4 L6 8 L24 8 L18 20 L-10 20 L-8 16 L10 16 L12 12 L-6 12 Z" fill="#E8200C" transform="skewX(-12)" />
        <line x1="2" y1="6" x2="14" y2="6" stroke="white" strokeWidth="0.8" opacity="0.5" transform="skewX(-12)" />
        <line x1="1" y1="9" x2="13" y2="9" stroke="white" strokeWidth="0.5" opacity="0.3" transform="skewX(-12)" />
        <path d="M30 0 L58 0 L56 4 L36 4 L30 20 L52 20 L50 24 L22 24 Z" fill="#E8200C" transform="skewX(-12)" />
      </g>

      {/* SERVICE */}
      <text x="80" y="68" textAnchor="middle" fill="#c8943e" fontSize="8" letterSpacing="8"
        fontFamily="'Georgia', serif" opacity="0.6">SERVICE</text>
      {/* COMPRESSION */}
      <text x="80" y="80" textAnchor="middle" fill="#c8943e" fontSize="8" letterSpacing="4"
        fontFamily="'Georgia', serif" opacity="0.6">COMPRESSION</text>

      {/* Divider */}
      <line x1="20" y1="90" x2="140" y2="90" stroke="#E8200C" strokeWidth="2" />
      <line x1="30" y1="94" x2="130" y2="94" stroke="#E8200C" strokeWidth="0.6" opacity="0.3" />

      {/* FIELD */}
      <text x="80" y="124" textAnchor="middle" fill="#E8200C" fontSize="32" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="4">FIELD</text>
      {/* TUNE */}
      <text x="80" y="155" textAnchor="middle" fill="white" fontSize="32" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="4">TUNE</text>

      {/* Speed lines */}
      <line x1="15" y1="164" x2="145" y2="164" stroke="#E8200C" strokeWidth="2.5" />
      <line x1="25" y1="168" x2="135" y2="168" stroke="#E8200C" strokeWidth="0.8" opacity="0.3" />

      {/* WELLLOGIC */}
      <text x="80" y="186" textAnchor="middle" fill="#888" fontSize="10" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="4">WELLLOGIC</text>

      {/* TM */}
      <text x="80" y="200" textAnchor="middle" fill="#444" fontSize="5" letterSpacing="2"
        fontFamily="'Georgia', serif">INJECTION OPTIMIZATION</text>
    </svg>
  )
}

// ─── LOGO 10: "THE OILFIELD" ───────────────────────────────────
// Derrick silhouette integrated with SC branding, rugged feel
export function OilfieldLogo({ size = 200 }) {
  const s = size / 200
  return (
    <svg width={200 * s} height={210 * s} viewBox="0 0 200 210" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background plate */}
      <rect x="6" y="6" width="188" height="198" rx="8" fill="#0a0a14" stroke="#333" strokeWidth="1" />

      {/* Derrick silhouette — left side accent */}
      <g opacity="0.2">
        <polygon points="30,170 46,40 50,40 38,170" fill="#E8200C" />
        <polygon points="58,170 50,40 54,40 66,170" fill="#E8200C" />
        <line x1="34" y1="140" x2="62" y2="140" stroke="#E8200C" strokeWidth="1" />
        <line x1="37" y1="110" x2="59" y2="110" stroke="#E8200C" strokeWidth="1" />
        <line x1="40" y1="80" x2="56" y2="80" stroke="#E8200C" strokeWidth="1" />
        <rect x="45" y="32" width="6" height="10" fill="#E8200C" />
        <path d="M48 32 Q45 22 48 12 Q51 22 48 32" fill="#E8200C" />
      </g>

      {/* Derrick silhouette — right side accent */}
      <g opacity="0.2" transform="translate(200, 0) scale(-1, 1)">
        <polygon points="30,170 46,40 50,40 38,170" fill="#E8200C" />
        <polygon points="58,170 50,40 54,40 66,170" fill="#E8200C" />
        <line x1="34" y1="140" x2="62" y2="140" stroke="#E8200C" strokeWidth="1" />
        <line x1="37" y1="110" x2="59" y2="110" stroke="#E8200C" strokeWidth="1" />
        <line x1="40" y1="80" x2="56" y2="80" stroke="#E8200C" strokeWidth="1" />
        <rect x="45" y="32" width="6" height="10" fill="#E8200C" />
        <path d="M48 32 Q45 22 48 12 Q51 22 48 32" fill="#E8200C" />
      </g>

      {/* SC Mark */}
      <g transform="translate(52, 24) scale(1.5)">
        <path d="M0 0 L28 0 L26 4 L8 4 L6 8 L24 8 L18 20 L-10 20 L-8 16 L10 16 L12 12 L-6 12 Z" fill="#E8200C" transform="skewX(-12)" />
        <line x1="2" y1="6" x2="14" y2="6" stroke="white" strokeWidth="0.8" opacity="0.5" transform="skewX(-12)" />
        <path d="M30 0 L58 0 L56 4 L36 4 L30 20 L52 20 L50 24 L22 24 Z" fill="#E8200C" transform="skewX(-12)" />
      </g>

      {/* SERVICE COMPRESSION */}
      <text x="100" y="74" textAnchor="middle" fill="#c8943e" fontSize="6" letterSpacing="3.5"
        fontFamily="'Georgia', serif" opacity="0.6">SERVICE COMPRESSION</text>

      {/* Red bar */}
      <rect x="25" y="80" width="150" height="3" rx="1.5" fill="#E8200C" />

      {/* FIELDTUNE */}
      <text x="100" y="110" textAnchor="middle" fill="white" fontSize="26" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="1">FIELDTUNE</text>
      <text x="175" y="97" fill="white" fontSize="5" fontFamily="'Arial', sans-serif" opacity="0.5">™</text>

      {/* Speed lines */}
      <line x1="25" y1="116" x2="175" y2="116" stroke="#E8200C" strokeWidth="2" />
      <line x1="35" y1="120" x2="165" y2="120" stroke="#E8200C" strokeWidth="0.7" opacity="0.3" />

      {/* WELLLOGIC */}
      <text x="100" y="142" textAnchor="middle" fill="#c8943e" fontSize="14" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="3">WELLLOGIC</text>

      {/* Tagline */}
      <text x="100" y="162" textAnchor="middle" fill="#666" fontSize="5.5" letterSpacing="2"
        fontFamily="'Georgia', serif">AUTOMATED GAS LIFT INJECTION OPTIMIZATION</text>

      {/* Bottom accent */}
      <line x1="60" y1="175" x2="140" y2="175" stroke="#E8200C" strokeWidth="0.5" opacity="0.3" />
      <text x="100" y="188" textAnchor="middle" fill="#444" fontSize="5" letterSpacing="3"
        fontFamily="'Georgia', serif">SINCE 2024</text>
    </svg>
  )
}

// ─── COMPACT VERSIONS FOR LOGOS 4-10 ───────────────────────────
// All compact logos use a simple SC + FIELDTUNE horizontal layout
function GenericCompact({ size = 36, accent = '#E8200C' }) {
  const s = size / 36
  return (
    <svg width={80 * s} height={36 * s} viewBox="0 0 80 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(2, 6) scale(0.6)">
        <path d="M0 0 L28 0 L26 4 L8 4 L6 8 L24 8 L18 20 L-10 20 L-8 16 L10 16 L12 12 L-6 12 Z" fill={accent} transform="skewX(-12)" />
        <path d="M30 0 L58 0 L56 4 L36 4 L30 20 L52 20 L50 24 L22 24 Z" fill={accent} transform="skewX(-12)" />
      </g>
      <line x1="32" y1="6" x2="32" y2="30" stroke={accent} strokeWidth="1" />
      <text x="36" y="16" fill={accent} fontSize="9" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="0.5">FIELDTUNE</text>
      <text x="36" y="28" fill="white" fontSize="7" fontWeight="900"
        fontFamily="'Arial Black', sans-serif" fontStyle="italic" letterSpacing="1">WELLLOGIC</text>
    </svg>
  )
}

// ─── LOGO MAP ──────────────────────────────────────────────────
export const LOGO_OPTIONS = [
  {
    id: 'heritage',
    name: 'The Heritage',
    desc: 'SC mark centered above stacked FieldTune/WellLogic type with speed-line accents and framed border.',
    Full: HeritageLogo,
    Compact: HeritageLogoCompact,
  },
  {
    id: 'technical',
    name: 'The Technical',
    desc: 'Angular shield badge with SC mark, well-node diagram, and speed-line racing stripes.',
    Full: TechnicalLogo,
    Compact: TechnicalLogoCompact,
  },
  {
    id: 'modern',
    name: 'The Modern',
    desc: 'Wide horizontal layout with bold SC mark, stacked type, and triple speed-line dividers.',
    Full: ModernLogo,
    Compact: ModernLogoCompact,
  },
  {
    id: 'industrial',
    name: 'The Industrial',
    desc: 'Heavy borders, red top bar, bold stacked type. Raw industrial strength.',
    Full: IndustrialLogo,
    Compact: (props) => <GenericCompact {...props} />,
  },
  {
    id: 'minimal',
    name: 'The Minimal',
    desc: 'Ultra-clean. Large SC mark, single line, elegant type. Premium whitespace.',
    Full: MinimalLogo,
    Compact: (props) => <GenericCompact {...props} />,
  },
  {
    id: 'badge',
    name: 'The Badge',
    desc: 'Circular seal with SC mark, curved text, gold accents, and star crown.',
    Full: BadgeLogo,
    Compact: (props) => <GenericCompact {...props} />,
  },
  {
    id: 'racing',
    name: 'The Racing',
    desc: 'Full speed-line racing theme. Diagonal stripes, aggressive italic, parallelogram frame.',
    Full: RacingLogo,
    Compact: (props) => <GenericCompact {...props} />,
  },
  {
    id: 'executive',
    name: 'The Executive',
    desc: 'Black-tie premium. Thin gold borders, serif typography, understated elegance.',
    Full: ExecutiveLogo,
    Compact: (props) => <GenericCompact {...props} />,
  },
  {
    id: 'stacked',
    name: 'The Stacked',
    desc: 'Vertical stack — FIELD over TUNE split type. Bold and compact.',
    Full: StackedLogo,
    Compact: (props) => <GenericCompact {...props} />,
  },
  {
    id: 'oilfield',
    name: 'The Oilfield',
    desc: 'Derrick silhouettes flanking SC branding. Rugged oilfield identity.',
    Full: OilfieldLogo,
    Compact: (props) => <GenericCompact {...props} />,
  },
]

export function getSelectedLogo(settings) {
  const id = settings?.selectedLogo || null
  if (!id) return null
  return LOGO_OPTIONS.find(l => l.id === id) || null
}
