import { useState } from 'react'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }
      onLogin(data)
    } catch {
      setError('Network error — check server connection')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #080810 0%, #0d0d1f 100%)' }}
    >
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="18" fill="#E8200C" fillOpacity="0.15" />
            <path d="M18 6L30 12V24L18 30L6 24V12L18 6Z" stroke="#E8200C" strokeWidth="1.5" fill="none" />
            <circle cx="18" cy="18" r="4" fill="#E8200C" />
          </svg>
          <span className="text-2xl font-bold text-white tracking-tight">FieldTune™</span>
        </div>
        <p className="text-slate-400 text-sm">Marketing Creator — Staff Access Only</p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl border p-8"
        style={{ background: '#11111e', borderColor: '#1e1e30' }}
      >
        <h1 className="text-lg font-semibold text-white mb-6">Sign in</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Username</label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-red-600 transition"
              style={{ background: '#080810', border: '1px solid #1e1e30' }}
              placeholder="your.username"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-red-600 transition"
              style={{ background: '#080810', border: '1px solid #1e1e30' }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 rounded-lg px-3 py-2 border border-red-900/40">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#E8200C' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Requires tech or admin role
        </p>
      </div>
    </div>
  )
}
