// 20 Well Logic logo concepts — SVG, all code-native, no external assets
// Service Compression brand palette: navy #0a1628, red #E8200C, white #fff
// compact(size) → used in headers/top bars (size ≈ 32–56)
// full(size)    → used on start screens / landing (size ≈ 80–160)

function L(id, label, compact, full) {
  return { id, label, compact, full }
}

const R = '#E8200C'
const N = '#0a1628'
const W = '#ffffff'
const G = '#a7a7b8'
const D = '#1a1a2e'

// Shared font string
const FB = "Arial Black, Arial, sans-serif"
const FM = "Arial, sans-serif"

export const LOGOS = [

  // ──── 1. CLEAN MINIMAL ─────────────────────────────────────────────────────
  L('logo-01', 'Clean Minimal', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      <text x="0" y="30" fontFamily={FB} fontSize="28" fill={R} letterSpacing="2">PAD</text>
      <text x="74" y="30" fontFamily={FB} fontSize="28" fill={W} letterSpacing="2">LOGIC</text>
      <rect x="0" y="36" width="208" height="2" fill={R} rx="1" />
      <text x="0" y="46" fontFamily={FM} fontSize="8" fill={G} letterSpacing="3">GAS LIFT OPTIMIZATION</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 72" style={{ height: size, width: 'auto' }}>
      <text x="0" y="44" fontFamily={FB} fontSize="42" fill={R} letterSpacing="3">PAD</text>
      <text x="110" y="44" fontFamily={FB} fontSize="42" fill={W} letterSpacing="3">LOGIC</text>
      <rect x="0" y="52" width="308" height="3" fill={R} rx="1" />
      <text x="0" y="68" fontFamily={FM} fontSize="10" fill={G} letterSpacing="4">GAS LIFT OPTIMIZATION</text>
    </svg>
  )),

  // ──── 2. BOLD INDUSTRIAL ───────────────────────────────────────────────────
  L('logo-02', 'Bold Industrial', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      <rect x="0" y="2" width="44" height="44" fill={R} rx="3" />
      <text x="22" y="31" fontFamily={FB} fontSize="20" fill={W} textAnchor="middle">PL</text>
      <text x="52" y="22" fontFamily={FB} fontSize="18" fill={W} letterSpacing="1">PAD</text>
      <text x="52" y="40" fontFamily={FB} fontSize="18" fill={G} letterSpacing="1">LOGIC</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <rect x="0" y="4" width="72" height="72" fill={R} rx="4" />
      <text x="36" y="50" fontFamily={FB} fontSize="32" fill={W} textAnchor="middle">PL</text>
      <text x="84" y="38" fontFamily={FB} fontSize="30" fill={W} letterSpacing="2">PAD</text>
      <text x="84" y="68" fontFamily={FB} fontSize="30" fill={G} letterSpacing="2">LOGIC</text>
    </svg>
  )),

  // ──── 3. TECH CIRCUIT ──────────────────────────────────────────────────────
  L('logo-03', 'Tech Circuit', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      {/* circuit trace */}
      <polyline points="4,24 12,24 12,8 20,8 20,24 28,24 28,36 36,36 36,24 44,24" fill="none" stroke={R} strokeWidth="2" />
      <circle cx="12" cy="8" r="2.5" fill={R} />
      <circle cx="28" cy="36" r="2.5" fill={R} />
      <circle cx="44" cy="24" r="2.5" fill={W} />
      <text x="52" y="21" fontFamily={FB} fontSize="16" fill={W} letterSpacing="1">WELL LOGIC</text>
      <text x="52" y="34" fontFamily={FM} fontSize="8" fill={G} letterSpacing="2">AUTOMATION SYSTEMS</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <polyline points="6,40 18,40 18,12 30,12 30,40 46,40 46,60 58,60 58,40 72,40" fill="none" stroke={R} strokeWidth="3" />
      <circle cx="18" cy="12" r="4" fill={R} />
      <circle cx="46" cy="60" r="4" fill={R} />
      <circle cx="72" cy="40" r="4" fill={W} />
      <text x="84" y="38" fontFamily={FB} fontSize="28" fill={W} letterSpacing="2">WELL LOGIC</text>
      <text x="84" y="58" fontFamily={FM} fontSize="12" fill={G} letterSpacing="3">AUTOMATION SYSTEMS</text>
    </svg>
  )),

  // ──── 4. HEXAGON BADGE ─────────────────────────────────────────────────────
  L('logo-04', 'Hexagon Badge', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      <polygon points="24,2 43,13 43,35 24,46 5,35 5,13" fill="none" stroke={R} strokeWidth="2" />
      <text x="24" y="30" fontFamily={FB} fontSize="13" fill={R} textAnchor="middle">PL</text>
      <text x="52" y="22" fontFamily={FB} fontSize="16" fill={W} letterSpacing="1">WELL LOGIC</text>
      <text x="52" y="36" fontFamily={FM} fontSize="8" fill={G} letterSpacing="2">INJECTION CONTROL</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <polygon points="40,4 70,22 70,58 40,76 10,58 10,22" fill="none" stroke={R} strokeWidth="3" />
      <text x="40" y="48" fontFamily={FB} fontSize="22" fill={R} textAnchor="middle">PL</text>
      <text x="86" y="40" fontFamily={FB} fontSize="26" fill={W} letterSpacing="2">WELL LOGIC</text>
      <text x="86" y="60" fontFamily={FM} fontSize="12" fill={G} letterSpacing="3">INJECTION CONTROL</text>
    </svg>
  )),

  // ──── 5. WELLHEAD ICON ─────────────────────────────────────────────────────
  L('logo-05', 'Wellhead Icon', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      {/* Simplified christmas tree / wellhead */}
      <rect x="18" y="30" width="12" height="14" fill={R} rx="1" />
      <rect x="14" y="22" width="20" height="10" fill={R} rx="1" />
      <rect x="8" y="14" width="32" height="10" fill={R} rx="1" />
      <rect x="4" y="8" width="40" height="8" fill={W} rx="1" />
      {/* flow pipes left/right */}
      <rect x="0" y="28" width="14" height="4" fill={G} rx="1" />
      <rect x="34" y="28" width="14" height="4" fill={G} rx="1" />
      <text x="52" y="22" fontFamily={FB} fontSize="16" fill={W} letterSpacing="1">WELL LOGIC</text>
      <text x="52" y="36" fontFamily={FM} fontSize="8" fill={G} letterSpacing="2">GAS LIFT CONTROL</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <rect x="30" y="50" width="20" height="24" fill={R} rx="1" />
      <rect x="22" y="36" width="36" height="16" fill={R} rx="1" />
      <rect x="12" y="22" width="56" height="16" fill={R} rx="1" />
      <rect x="4" y="10" width="72" height="14" fill={W} rx="1" />
      <rect x="0" y="46" width="22" height="6" fill={G} rx="1" />
      <rect x="58" y="46" width="22" height="6" fill={G} rx="1" />
      <text x="90" y="40" fontFamily={FB} fontSize="26" fill={W} letterSpacing="2">WELL LOGIC</text>
      <text x="90" y="60" fontFamily={FM} fontSize="12" fill={G} letterSpacing="3">GAS LIFT CONTROL</text>
    </svg>
  )),

  // ──── 6. DATA PULSE ────────────────────────────────────────────────────────
  L('logo-06', 'Data Pulse', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      <text x="4" y="30" fontFamily={FB} fontSize="22" fill={W} letterSpacing="2">WELL LOGIC</text>
      {/* EKG pulse line across text baseline */}
      <polyline
        points="0,38 20,38 26,20 32,48 38,24 44,38 64,38 72,38 78,32 84,44 88,38 220,38"
        fill="none" stroke={R} strokeWidth="2" />
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <text x="4" y="46" fontFamily={FB} fontSize="36" fill={W} letterSpacing="3">WELL LOGIC</text>
      <polyline
        points="0,60 28,60 40,30 52,76 64,38 76,60 100,60 116,60 128,48 140,70 150,60 320,60"
        fill="none" stroke={R} strokeWidth="3" />
    </svg>
  )),

  // ──── 7. DIAMOND BADGE ─────────────────────────────────────────────────────
  L('logo-07', 'Diamond Badge', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      <rect x="10" y="10" width="28" height="28" fill={R} transform="rotate(45 24 24)" rx="2" />
      <text x="24" y="29" fontFamily={FB} fontSize="10" fill={W} textAnchor="middle">PL</text>
      <text x="52" y="22" fontFamily={FB} fontSize="16" fill={W} letterSpacing="1">WELL LOGIC</text>
      <text x="52" y="36" fontFamily={FM} fontSize="8" fill={G} letterSpacing="2">FIELD AUTOMATION</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <rect x="18" y="18" width="44" height="44" fill={R} transform="rotate(45 40 40)" rx="3" />
      <text x="40" y="46" fontFamily={FB} fontSize="16" fill={W} textAnchor="middle">PL</text>
      <text x="86" y="40" fontFamily={FB} fontSize="26" fill={W} letterSpacing="2">WELL LOGIC</text>
      <text x="86" y="60" fontFamily={FM} fontSize="12" fill={G} letterSpacing="3">FIELD AUTOMATION</text>
    </svg>
  )),

  // ──── 8. GEAR / MECHANICAL ─────────────────────────────────────────────────
  L('logo-08', 'Gear Mechanical', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      <circle cx="24" cy="24" r="14" fill="none" stroke={W} strokeWidth="2" />
      <circle cx="24" cy="24" r="5" fill={R} />
      {/* gear teeth — 8 teeth */}
      {[0,45,90,135,180,225,270,315].map((a,i) => {
        const r1=14, r2=20, rad=a*Math.PI/180
        return <rect key={i} x={24+r1*Math.cos(rad)-3} y={24+r1*Math.sin(rad)-3} width="6" height="6" fill={W} transform={`rotate(${a} ${24+r1*Math.cos(rad)} ${24+r1*Math.sin(rad)})`} />
      })}
      <text x="46" y="22" fontFamily={FB} fontSize="16" fill={W} letterSpacing="1">WELL LOGIC</text>
      <text x="46" y="36" fontFamily={FM} fontSize="8" fill={G} letterSpacing="2">MECHANICAL CONTROL</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <circle cx="40" cy="40" r="24" fill="none" stroke={W} strokeWidth="3" />
      <circle cx="40" cy="40" r="8" fill={R} />
      {[0,45,90,135,180,225,270,315].map((a,i) => {
        const r1=24, rad=a*Math.PI/180
        return <rect key={i} x={40+r1*Math.cos(rad)-5} y={40+r1*Math.sin(rad)-5} width="10" height="10" fill={W} transform={`rotate(${a} ${40+r1*Math.cos(rad)} ${40+r1*Math.sin(rad)})`} />
      })}
      <text x="74" y="40" fontFamily={FB} fontSize="26" fill={W} letterSpacing="2">WELL LOGIC</text>
      <text x="74" y="60" fontFamily={FM} fontSize="12" fill={G} letterSpacing="3">MECHANICAL CONTROL</text>
    </svg>
  )),

  // ──── 9. SHIELD EMBLEM ─────────────────────────────────────────────────────
  L('logo-09', 'Shield Emblem', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      <path d="M24,2 L42,10 L42,28 Q42,40 24,46 Q6,40 6,28 L6,10 Z" fill="none" stroke={R} strokeWidth="2" />
      <text x="24" y="30" fontFamily={FB} fontSize="11" fill={W} textAnchor="middle">PL</text>
      <text x="50" y="22" fontFamily={FB} fontSize="16" fill={W} letterSpacing="1">WELL LOGIC</text>
      <text x="50" y="36" fontFamily={FM} fontSize="8" fill={G} letterSpacing="2">PROTECTED PRODUCTION</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <path d="M40,4 L70,18 L70,48 Q70,68 40,76 Q10,68 10,48 L10,18 Z" fill="none" stroke={R} strokeWidth="3" />
      <text x="40" y="48" fontFamily={FB} fontSize="18" fill={W} textAnchor="middle">PL</text>
      <text x="82" y="40" fontFamily={FB} fontSize="26" fill={W} letterSpacing="2">WELL LOGIC</text>
      <text x="82" y="60" fontFamily={FM} fontSize="10" fill={G} letterSpacing="3">PROTECTED PRODUCTION</text>
    </svg>
  )),

  // ──── 10. CHEVRON ARROW ────────────────────────────────────────────────────
  L('logo-10', 'Chevron Arrow', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      <polyline points="4,8 18,24 4,40" fill="none" stroke={R} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16,8 30,24 16,40" fill="none" stroke={R} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <text x="38" y="22" fontFamily={FB} fontSize="16" fill={W} letterSpacing="1">WELL LOGIC</text>
      <text x="38" y="36" fontFamily={FM} fontSize="8" fill={G} letterSpacing="2">FORWARD OPTIMIZATION</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <polyline points="4,12 24,40 4,68" fill="none" stroke={R} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="24,12 44,40 24,68" fill="none" stroke={R} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <text x="56" y="42" fontFamily={FB} fontSize="28" fill={W} letterSpacing="2">WELL LOGIC</text>
      <text x="56" y="62" fontFamily={FM} fontSize="12" fill={G} letterSpacing="3">FORWARD OPTIMIZATION</text>
    </svg>
  )),

  // ──── 11. OILFIELD DERRICK ─────────────────────────────────────────────────
  L('logo-11', 'Oilfield Derrick', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      {/* abstract derrick: A-frame */}
      <line x1="24" y1="4" x2="6" y2="44" stroke={W} strokeWidth="2" />
      <line x1="24" y1="4" x2="42" y2="44" stroke={W} strokeWidth="2" />
      <line x1="8" y1="40" x2="40" y2="40" stroke={W} strokeWidth="2" />
      <line x1="12" y1="28" x2="36" y2="28" stroke={G} strokeWidth="1.5" />
      <circle cx="24" cy="4" r="3" fill={R} />
      <text x="50" y="22" fontFamily={FB} fontSize="16" fill={W} letterSpacing="1">WELL LOGIC</text>
      <text x="50" y="36" fontFamily={FM} fontSize="8" fill={G} letterSpacing="2">WELLSITE INTELLIGENCE</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <line x1="40" y1="6" x2="8" y2="72" stroke={W} strokeWidth="3" />
      <line x1="40" y1="6" x2="72" y2="72" stroke={W} strokeWidth="3" />
      <line x1="10" y1="66" x2="70" y2="66" stroke={W} strokeWidth="3" />
      <line x1="18" y1="44" x2="62" y2="44" stroke={G} strokeWidth="2" />
      <circle cx="40" cy="6" r="5" fill={R} />
      <text x="84" y="40" fontFamily={FB} fontSize="26" fill={W} letterSpacing="2">WELL LOGIC</text>
      <text x="84" y="60" fontFamily={FM} fontSize="12" fill={G} letterSpacing="3">WELLSITE INTELLIGENCE</text>
    </svg>
  )),

  // ──── 12. COMPRESSION WAVE ─────────────────────────────────────────────────
  L('logo-12', 'Compression Wave', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      <path d="M2,24 Q8,10 14,24 Q20,38 26,24 Q32,10 38,24 Q44,38 50,24" fill="none" stroke={R} strokeWidth="2.5" />
      <circle cx="50" cy="24" r="3" fill={R} />
      <text x="60" y="22" fontFamily={FB} fontSize="16" fill={W} letterSpacing="1">WELL LOGIC</text>
      <text x="60" y="36" fontFamily={FM} fontSize="8" fill={G} letterSpacing="2">COMPRESSION CONTROL</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <path d="M4,40 Q14,16 24,40 Q34,64 44,40 Q54,16 64,40 Q74,64 84,40" fill="none" stroke={R} strokeWidth="4" />
      <circle cx="84" cy="40" r="5" fill={R} />
      <text x="96" y="42" fontFamily={FB} fontSize="26" fill={W} letterSpacing="2">WELL LOGIC</text>
      <text x="96" y="62" fontFamily={FM} fontSize="12" fill={G} letterSpacing="3">COMPRESSION CONTROL</text>
    </svg>
  )),

  // ──── 13. TERMINAL ─────────────────────────────────────────────────────────
  L('logo-13', 'Terminal / Code', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      <rect x="0" y="4" width="220" height="40" fill={N} rx="4" />
      <rect x="0" y="4" width="220" height="8" fill={D} rx="4" />
      <circle cx="10" cy="8" r="3" fill="#E8200C" />
      <circle cx="22" cy="8" r="3" fill="#eab308" />
      <circle cx="34" cy="8" r="3" fill="#22c55e" />
      <text x="6" y="35" fontFamily="'Courier New', Courier, monospace" fontSize="16" fill={R}>{'>'}</text>
      <text x="20" y="35" fontFamily="'Courier New', Courier, monospace" fontSize="16" fill={W}>WELL_LOGIC</text>
      <rect x="163" y="20" width="8" height="16" fill={W} opacity="0.8">
        <animate attributeName="opacity" values="0.8;0;0.8" dur="1.2s" repeatCount="indefinite" />
      </rect>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <rect x="0" y="4" width="320" height="72" fill={N} rx="6" />
      <rect x="0" y="4" width="320" height="14" fill={D} rx="6" />
      <circle cx="14" cy="11" r="4.5" fill="#E8200C" />
      <circle cx="30" cy="11" r="4.5" fill="#eab308" />
      <circle cx="46" cy="11" r="4.5" fill="#22c55e" />
      <text x="8" y="56" fontFamily="'Courier New', Courier, monospace" fontSize="28" fill={R}>{'>'}</text>
      <text x="36" y="56" fontFamily="'Courier New', Courier, monospace" fontSize="28" fill={W}>WELL_LOGIC</text>
      <rect x="270" y="32" width="12" height="26" fill={W} opacity="0.8">
        <animate attributeName="opacity" values="0.8;0;0.8" dur="1.2s" repeatCount="indefinite" />
      </rect>
    </svg>
  )),

  // ──── 14. NETWORK NODE ─────────────────────────────────────────────────────
  L('logo-14', 'Network Node', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      {/* 4 nodes in a diamond */}
      <line x1="24" y1="8" x2="8" y2="24" stroke={G} strokeWidth="1.5" />
      <line x1="24" y1="8" x2="40" y2="24" stroke={G} strokeWidth="1.5" />
      <line x1="8" y1="24" x2="24" y2="40" stroke={G} strokeWidth="1.5" />
      <line x1="40" y1="24" x2="24" y2="40" stroke={G} strokeWidth="1.5" />
      <line x1="8" y1="24" x2="40" y2="24" stroke={R} strokeWidth="1.5" />
      <circle cx="24" cy="8" r="4" fill={R} />
      <circle cx="8" cy="24" r="4" fill={W} />
      <circle cx="40" cy="24" r="4" fill={W} />
      <circle cx="24" cy="40" r="4" fill={R} />
      <text x="50" y="22" fontFamily={FB} fontSize="16" fill={W} letterSpacing="1">WELL LOGIC</text>
      <text x="50" y="36" fontFamily={FM} fontSize="8" fill={G} letterSpacing="2">CONNECTED SYSTEMS</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <line x1="40" y1="10" x2="10" y2="40" stroke={G} strokeWidth="2" />
      <line x1="40" y1="10" x2="70" y2="40" stroke={G} strokeWidth="2" />
      <line x1="10" y1="40" x2="40" y2="70" stroke={G} strokeWidth="2" />
      <line x1="70" y1="40" x2="40" y2="70" stroke={G} strokeWidth="2" />
      <line x1="10" y1="40" x2="70" y2="40" stroke={R} strokeWidth="2" />
      <circle cx="40" cy="10" r="6" fill={R} />
      <circle cx="10" cy="40" r="6" fill={W} />
      <circle cx="70" cy="40" r="6" fill={W} />
      <circle cx="40" cy="70" r="6" fill={R} />
      <text x="86" y="40" fontFamily={FB} fontSize="26" fill={W} letterSpacing="2">WELL LOGIC</text>
      <text x="86" y="60" fontFamily={FM} fontSize="12" fill={G} letterSpacing="3">CONNECTED SYSTEMS</text>
    </svg>
  )),

  // ──── 15. RING EMBLEM ──────────────────────────────────────────────────────
  L('logo-15', 'Ring Emblem', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      <circle cx="24" cy="24" r="20" fill="none" stroke={W} strokeWidth="2" />
      <circle cx="24" cy="24" r="14" fill="none" stroke={R} strokeWidth="2" />
      <text x="24" y="29" fontFamily={FB} fontSize="10" fill={W} textAnchor="middle">PL</text>
      <text x="52" y="22" fontFamily={FB} fontSize="16" fill={W} letterSpacing="1">WELL LOGIC</text>
      <text x="52" y="36" fontFamily={FM} fontSize="8" fill={G} letterSpacing="2">PRECISION CONTROL</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <circle cx="40" cy="40" r="34" fill="none" stroke={W} strokeWidth="3" />
      <circle cx="40" cy="40" r="22" fill="none" stroke={R} strokeWidth="3" />
      <text x="40" y="48" fontFamily={FB} fontSize="16" fill={W} textAnchor="middle">PL</text>
      <text x="84" y="40" fontFamily={FB} fontSize="26" fill={W} letterSpacing="2">WELL LOGIC</text>
      <text x="84" y="60" fontFamily={FM} fontSize="12" fill={G} letterSpacing="3">PRECISION CONTROL</text>
    </svg>
  )),

  // ──── 16. BRACKET SYSTEM ───────────────────────────────────────────────────
  L('logo-16', 'Bracket System', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      <text x="4" y="30" fontFamily={FB} fontSize="22" fill={R}>[</text>
      <text x="18" y="30" fontFamily={FB} fontSize="18" fill={W} letterSpacing="1">WELL LOGIC</text>
      <text x="186" y="30" fontFamily={FB} fontSize="22" fill={R}>]</text>
      <text x="18" y="42" fontFamily={FM} fontSize="7" fill={G} letterSpacing="3">CONTROL SYSTEM</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <text x="4" y="52" fontFamily={FB} fontSize="38" fill={R}>[</text>
      <text x="28" y="52" fontFamily={FB} fontSize="30" fill={W} letterSpacing="2">WELL LOGIC</text>
      <text x="292" y="52" fontFamily={FB} fontSize="38" fill={R}>]</text>
      <text x="28" y="68" fontFamily={FM} fontSize="11" fill={G} letterSpacing="4">CONTROL SYSTEM</text>
    </svg>
  )),

  // ──── 17. CORNER MARK ──────────────────────────────────────────────────────
  L('logo-17', 'Corner Mark', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      {/* Bold L-bracket corner accent */}
      <polyline points="4,44 4,4 44,4" fill="none" stroke={R} strokeWidth="5" strokeLinecap="square" />
      <text x="10" y="38" fontFamily={FB} fontSize="22" fill={W} letterSpacing="1">PL</text>
      <text x="52" y="22" fontFamily={FB} fontSize="16" fill={W} letterSpacing="1">WELL LOGIC</text>
      <text x="52" y="36" fontFamily={FM} fontSize="8" fill={G} letterSpacing="2">PRECISION SYSTEMS</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <polyline points="6,74 6,6 74,6" fill="none" stroke={R} strokeWidth="8" strokeLinecap="square" />
      <text x="14" y="64" fontFamily={FB} fontSize="36" fill={W} letterSpacing="2">PL</text>
      <text x="86" y="40" fontFamily={FB} fontSize="26" fill={W} letterSpacing="2">WELL LOGIC</text>
      <text x="86" y="60" fontFamily={FM} fontSize="12" fill={G} letterSpacing="3">PRECISION SYSTEMS</text>
    </svg>
  )),

  // ──── 18. SLASH / FORWARD MOTION ───────────────────────────────────────────
  L('logo-18', 'Slash Motion', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      <text x="4" y="30" fontFamily={FB} fontSize="20" fill={W} letterSpacing="1">PAD</text>
      <line x1="54" y1="6" x2="66" y2="42" stroke={R} strokeWidth="4" strokeLinecap="round" />
      <text x="72" y="30" fontFamily={FB} fontSize="20" fill={W} letterSpacing="1">LOGIC</text>
      <text x="4" y="42" fontFamily={FM} fontSize="7" fill={G} letterSpacing="3">AUTOMATED INJECTION CONTROL</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <text x="4" y="52" fontFamily={FB} fontSize="34" fill={W} letterSpacing="2">PAD</text>
      <line x1="90" y1="10" x2="108" y2="70" stroke={R} strokeWidth="6" strokeLinecap="round" />
      <text x="114" y="52" fontFamily={FB} fontSize="34" fill={W} letterSpacing="2">LOGIC</text>
      <text x="4" y="70" fontFamily={FM} fontSize="10" fill={G} letterSpacing="4">AUTOMATED INJECTION CONTROL</text>
    </svg>
  )),

  // ──── 19. ATOM / ORBIT ─────────────────────────────────────────────────────
  L('logo-19', 'Atom Orbit', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      {/* Two elliptical orbits */}
      <ellipse cx="24" cy="24" rx="20" ry="9" fill="none" stroke={G} strokeWidth="1.5" />
      <ellipse cx="24" cy="24" rx="9" ry="20" fill="none" stroke={G} strokeWidth="1.5" />
      <circle cx="24" cy="24" r="5" fill={R} />
      {/* orbital dot */}
      <circle cx="44" cy="24" r="3" fill={W} />
      <text x="52" y="22" fontFamily={FB} fontSize="16" fill={W} letterSpacing="1">WELL LOGIC</text>
      <text x="52" y="36" fontFamily={FM} fontSize="8" fill={G} letterSpacing="2">DYNAMIC OPTIMIZATION</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <ellipse cx="40" cy="40" rx="34" ry="16" fill="none" stroke={G} strokeWidth="2" />
      <ellipse cx="40" cy="40" rx="16" ry="34" fill="none" stroke={G} strokeWidth="2" />
      <circle cx="40" cy="40" r="8" fill={R} />
      <circle cx="74" cy="40" r="5" fill={W} />
      <text x="86" y="40" fontFamily={FB} fontSize="26" fill={W} letterSpacing="2">WELL LOGIC</text>
      <text x="86" y="60" fontFamily={FM} fontSize="12" fill={G} letterSpacing="3">DYNAMIC OPTIMIZATION</text>
    </svg>
  )),

  // ──── 20. MINIMAL DOT ──────────────────────────────────────────────────────
  L('logo-20', 'Minimal Dot', (size) => (
    <svg height={size} viewBox="0 0 220 48" style={{ height: size, width: 'auto' }}>
      <circle cx="8" cy="12" r="6" fill={R} />
      <text x="20" y="20" fontFamily={FB} fontSize="22" fill={W} letterSpacing="3">WELL LOGIC</text>
      <text x="20" y="36" fontFamily={FM} fontSize="9" fill={G} letterSpacing="5">THE NIGHT CREW</text>
    </svg>
  ), (size) => (
    <svg height={size} viewBox="0 0 320 80" style={{ height: size, width: 'auto' }}>
      <circle cx="12" cy="18" r="10" fill={R} />
      <text x="30" y="34" fontFamily={FB} fontSize="36" fill={W} letterSpacing="4">WELL LOGIC</text>
      <text x="30" y="56" fontFamily={FM} fontSize="12" fill={G} letterSpacing="6">THE NIGHT CREW</text>
    </svg>
  )),
]
