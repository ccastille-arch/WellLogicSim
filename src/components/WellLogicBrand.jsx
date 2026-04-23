import { useAuth } from './auth/AuthProvider'
import padLogicLogo from '../assets/pad-logic-logo.png'
import { LOGOS } from '../constants/logos'

function BrandArt({ width, height, mode = 'full' }) {
  const full = mode === 'full'
  return (
    <div
      role="img"
      aria-label="Pad Logic"
      style={{
        width,
        height,
        backgroundImage: `url(${padLogicLogo})`,
        backgroundRepeat: 'no-repeat',
        backgroundColor: 'transparent',
        backgroundSize: full ? '168% auto' : '490% auto',
        backgroundPosition: full ? 'center 48%' : '19% 49%',
      }}
    />
  )
}

function useActiveLogo() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { settings } = useAuth()
    const id = settings?.activeLogoId
    return id ? (LOGOS.find(l => l.id === id) ?? null) : null
  } catch {
    // useAuth throws if called outside AuthProvider (e.g. error boundary)
    return null
  }
}

export function WellLogicLogo({ size = 160 }) {
  const activeLogo = useActiveLogo()
  if (activeLogo) {
    return <div className="inline-flex items-center justify-center">{activeLogo.full(size)}</div>
  }
  return (
    <div className="inline-flex items-center justify-center">
      <BrandArt width={Math.round(size * 2.9)} height={Math.round(size * 1.08)} mode="full" />
    </div>
  )
}

export function WellLogicCompact({ size = 38 }) {
  const activeLogo = useActiveLogo()
  if (activeLogo) {
    return <div className="inline-flex items-center">{activeLogo.compact(size)}</div>
  }
  return (
    <div className="inline-flex items-center gap-2.5">
      <BrandArt width={size} height={size} mode="compact" />
      <div className="leading-none">
        <div
          className="text-[15px] text-white font-black uppercase tracking-[0.14em]"
          style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}
        >
          Pad Logic
        </div>
        <div className="text-[7px] uppercase tracking-[0.18em] text-[#a7a7b8] font-bold">
          The Night Crew That Never Goes Home
        </div>
      </div>
    </div>
  )
}

export default WellLogicLogo
