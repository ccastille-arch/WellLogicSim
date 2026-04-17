import { useState } from 'react'
import { useAuth } from './AuthProvider'
import WellLogicLogo from '../WellLogicBrand'

/**
 * SignupGate — Service Compression brand treatment.
 *
 * Functional contract is unchanged (first name = username, last name =
 * password; Admin / Tech Team Login link flips to credential login).
 * Visual surface is rebuilt against the SC web brand:
 *   - navy #05233E body + navy-light #0F3C64 card surface
 *   - SC red #D32028 primary CTA with SC typographic discipline
 *   - Montserrat everywhere, 2px letter-spacing on uppercase labels
 *   - Cyan eyebrow + red rule above the logo lockup (SC section pattern)
 */
export default function SignupGate() {
  const { signup, login } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState('signup') // signup | admin

  const [adminUser, setAdminUser] = useState('')
  const [adminPass, setAdminPass] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSignup = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name')
      return
    }
    setSubmitting(true)
    const result = await signup(firstName.trim(), lastName.trim())
    if (!result.success) {
      setError(result.error)
      setSubmitting(false)
    }
  }

  const handleAdminLogin = async () => {
    if (!adminUser.trim() || !adminPass) {
      setError('Username and password are required')
      return
    }
    setSubmitting(true)
    const result = await login(adminUser.trim(), adminPass)
    if (!result.success) {
      setError(result.error)
      setAdminPass('')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="flex-1 flex flex-col overflow-auto py-10 relative"
      style={{
        background:
          'radial-gradient(ellipse at 50% 20%, #0F3C64 0%, #05233E 55%, #03172A 100%)',
      }}
    >
      {/* Decorative cyan hex grid accent */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(73,208,226,0.08) 1px, transparent 0)',
          backgroundSize: '22px 22px',
          maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.55), transparent 70%)',
          WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.55), transparent 70%)',
        }}
      />
      {/* Red conic accent in the corner */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          right: -160, top: -40, width: 420, height: 420,
          background:
            'conic-gradient(from 210deg at 50% 50%, rgba(211,32,40,0.22), rgba(211,32,40,0) 35%, rgba(211,32,40,0) 65%, rgba(211,32,40,0.16))',
          filter: 'blur(30px)',
        }}
      />

      <div className="w-[460px] max-w-full px-4 mx-auto my-auto relative z-10">
        {/* Eyebrow → Rule → Logo — SC section pattern */}
        <div className="text-center mb-8">
          <div
            className="sc-eyebrow mb-2"
            style={{ display: 'inline-block' }}
          >
            Service Compression · FieldTune
          </div>
          <div className="flex justify-center mb-1">
            <span className="sc-rule" aria-hidden="true" />
          </div>
          <div className="flex justify-center mb-4">
            <WellLogicLogo size={110} />
          </div>
          <div
            className="text-[12px] text-white/70 tracking-[0.12em] uppercase"
            style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}
          >
            Automated Gas Lift Injection Optimization
          </div>
        </div>

        {mode === 'signup' ? (
          <div
            className="sc-card"
            style={{ borderRadius: 2 }}
          >
            <h2
              className="text-white mb-2"
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 800,
                fontSize: 24,
                lineHeight: 1.1,
                letterSpacing: '-0.3px',
              }}
            >
              Welcome
            </h2>
            <p
              className="text-white/75 mb-2"
              style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 13, lineHeight: 1.5 }}
            >
              Anyone can log in with their name.
            </p>
            <p
              className="text-white/55 mb-6"
              style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 12, lineHeight: 1.5 }}
            >
              First name becomes your username. Last name becomes your password.
              Enter the same name later to sign back in.
            </p>

            <SCInput
              value={firstName}
              onChange={v => { setFirstName(v); setError('') }}
              onEnter={() => document.getElementById('lastname-input')?.focus()}
              placeholder="First Name"
              autoFocus
            />
            <div style={{ height: 12 }} />
            <SCInput
              id="lastname-input"
              value={lastName}
              onChange={v => { setLastName(v); setError('') }}
              onEnter={handleSignup}
              placeholder="Last Name"
            />

            {error && (
              <p
                className="mt-3"
                style={{
                  color: '#FF5A62',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {error}
              </p>
            )}

            <button
              onClick={handleSignup}
              disabled={submitting}
              className="sc-btn-primary w-full mt-6"
              style={{ width: '100%' }}
            >
              {submitting ? 'Connecting…' : 'Continue →'}
            </button>

            <div className="text-center mt-5">
              <button
                onClick={() => { setMode('admin'); setError(''); setSubmitting(false) }}
                className="hover:text-white transition-colors"
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  color: '#49D0E2',
                  background: 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                Admin / Tech Team Login
              </button>
            </div>
          </div>
        ) : (
          <div
            className="sc-card"
            style={{ borderRadius: 2 }}
          >
            <h2
              className="text-white mb-2"
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: 800,
                fontSize: 24,
                lineHeight: 1.1,
                letterSpacing: '-0.3px',
              }}
            >
              Team Login
            </h2>
            <p
              className="text-white/65 mb-6"
              style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 12, lineHeight: 1.5 }}
            >
              Use this only for dedicated admin or tech credentials.
            </p>

            <SCInput
              value={adminUser}
              onChange={v => { setAdminUser(v); setError('') }}
              onEnter={() => document.getElementById('admin-pass')?.focus()}
              placeholder="Username"
              autoFocus
            />
            <div style={{ height: 12 }} />
            <SCInput
              id="admin-pass"
              type="password"
              value={adminPass}
              onChange={v => { setAdminPass(v); setError('') }}
              onEnter={handleAdminLogin}
              placeholder="Password"
            />

            {error && (
              <p
                className="mt-3"
                style={{
                  color: '#FF5A62',
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {error}
              </p>
            )}

            <button
              onClick={handleAdminLogin}
              disabled={submitting}
              className="sc-btn-primary w-full mt-6"
              style={{ width: '100%' }}
            >
              {submitting ? 'Connecting…' : 'Login →'}
            </button>

            <div className="text-center mt-5">
              <button
                onClick={() => { setMode('signup'); setError(''); setSubmitting(false) }}
                className="hover:text-white transition-colors"
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 10,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.55)',
                  background: 'transparent',
                  border: 0,
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                ← Back to Name Login
              </button>
            </div>
          </div>
        )}

        <div
          className="text-center mt-8"
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
            fontWeight: 600,
          }}
        >
          Service Compression
        </div>
      </div>
    </div>
  )
}

/**
 * SCInput — SC-brand-styled text input. Navy-on-navy with a red focus
 * underline (matches SC form treatment). Functional props kept minimal
 * to match the call-sites above.
 */
function SCInput({ id, value, onChange, onEnter, placeholder, autoFocus, type = 'text' }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === 'Enter' && onEnter?.()}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className="w-full outline-none transition-colors"
      style={{
        background: 'rgba(0, 0, 0, 0.25)',
        border: `1px solid ${focused ? '#49D0E2' : 'rgba(255, 255, 255, 0.15)'}`,
        borderBottomColor: focused ? '#D32028' : 'rgba(255, 255, 255, 0.15)',
        borderBottomWidth: focused ? 2 : 1,
        padding: '12px 14px',
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: 500,
        borderRadius: 2,
        letterSpacing: 0.2,
      }}
    />
  )
}
