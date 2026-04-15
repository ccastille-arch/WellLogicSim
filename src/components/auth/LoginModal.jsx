import { useState } from 'react'
import { useAuth } from './AuthProvider'

export default function LoginModal({ onClose, title }) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => !submitting && onClose()}>
      <div className="bg-[#111118] border border-[#333] rounded-xl p-8 w-[380px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">Lock</span>
          <h2 className="text-lg text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>{title || 'Login'}</h2>
        </div>
        <p className="text-[11px] text-[#888] mb-4">Use your team credentials here. General users enter their first and last name on the welcome screen.</p>
        <input type="text" value={username} onChange={e => { setUsername(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Username" autoFocus
          className="w-full bg-[#1a1a2a] border border-[#333] rounded px-3 py-2.5 text-white text-sm outline-none focus:border-[#E8200C] mb-3" />
        <input type="password" value={password} onChange={e => { setPassword(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Password"
          className="w-full bg-[#1a1a2a] border border-[#333] rounded px-3 py-2.5 text-white text-sm outline-none focus:border-[#E8200C] mb-3" />
        {error && <p className="text-[#E8200C] text-[11px] mb-3">{error}</p>}
        <div className="flex gap-2">
          <button onClick={() => onClose()} disabled={submitting} className="flex-1 py-2 text-[11px] font-bold text-[#888] border border-[#333] rounded hover:text-white disabled:opacity-60">Cancel</button>
          <button onClick={handleLogin} disabled={submitting} className="flex-1 py-2 text-[11px] font-bold bg-[#E8200C] text-white rounded hover:bg-[#c01a0a] disabled:opacity-60">{submitting ? 'Logging in...' : 'Login'}</button>
        </div>
      </div>
    </div>
  )
}
