import { useState } from 'react'
import { useAuth } from './AuthProvider'

/**
 * LoginModal — SC-branded team credential modal (used for gated tiles).
 * Functional behavior unchanged; visual surface matches the SC web brand.
 */
export default function LoginModal({ onClose, title }) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Username and password are required')
      return
    }
    setSubmitting(true)
    const result = await login(username.trim(), password)
    if (result.success) onClose(result.user)
    else {
      setError(result.error)
      setPassword('')
      setSubmitting(false)
    }
  }

  const inputStyle = (name) => ({
    width: '100%',
    background: 'rgba(0, 0, 0, 0.28)',
    border: `1px solid ${focusedField === name ? '#49D0E2' : 'rgba(255, 255, 255, 0.15)'}`,
    borderBottomColor: focusedField === name ? '#D32028' : 'rgba(255, 255, 255, 0.15)',
    borderBottomWidth: focusedField === name ? 2 : 1,
    borderRadius: 2,
    padding: '11px 14px',
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 500,
    outline: 'none',
    marginBottom: 12,
    transition: 'border-color 150ms',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(3, 23, 42, 0.75)', backdropFilter: 'blur(4px)' }}
      onClick={() => !submitting && onClose()}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 400,
          maxWidth: '92vw',
          background: '#0F3C64',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderTop: '2px solid #D32028',
          borderRadius: 2,
          padding: 28,
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div className="sc-eyebrow mb-2">Restricted Access</div>
        <h2
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: '-0.3px',
            color: '#FFFFFF',
            marginBottom: 14,
          }}
        >
          {title || 'Login'}
        </h2>

        <p
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 500,
            fontSize: 12,
            color: 'rgba(255, 255, 255, 0.65)',
            marginBottom: 18,
            lineHeight: 1.5,
          }}
        >
          Use your team credentials here. General users enter their first and
          last name on the welcome screen.
        </p>

        <input
          type="text"
          value={username}
          onChange={e => { setUsername(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          onFocus={() => setFocusedField('user')}
          onBlur={() => setFocusedField(null)}
          placeholder="Username"
          autoFocus
          style={inputStyle('user')}
        />
        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          onFocus={() => setFocusedField('pass')}
          onBlur={() => setFocusedField(null)}
          placeholder="Password"
          style={inputStyle('pass')}
        />

        {error && (
          <p
            style={{
              color: '#FF5A62',
              fontSize: 12,
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: 500,
              marginBottom: 12,
            }}
          >
            {error}
          </p>
        )}

        <div className="flex gap-3 mt-2">
          <button
            onClick={() => onClose()}
            disabled={submitting}
            className="sc-btn-ghost"
            style={{ flex: 1, padding: '11px 18px', fontSize: 11 }}
          >
            Cancel
          </button>
          <button
            onClick={handleLogin}
            disabled={submitting}
            className="sc-btn-primary"
            style={{ flex: 1, padding: '11px 18px', fontSize: 11 }}
          >
            {submitting ? 'Logging in…' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  )
}
