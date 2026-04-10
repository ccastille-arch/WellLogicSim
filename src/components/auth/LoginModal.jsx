import { useState } from 'react'
import { useAuth } from './AuthProvider'

export default function LoginModal({ onClose, title }) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = () => {
    const result = login(username, password)
    if (result.success) onClose(result.user)
    else { setError(result.error); setPassword('') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-[#111118] border border-[#333] rounded-xl p-8 w-[380px] shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🔐</span>
          <h2 className="text-lg text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>{title || 'Login'}</h2>
        </div>
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
          <button onClick={() => onClose()} className="flex-1 py-2 text-[11px] font-bold text-[#888] border border-[#333] rounded hover:text-white">Cancel</button>
          <button onClick={handleLogin} className="flex-1 py-2 text-[11px] font-bold bg-[#E8200C] text-white rounded hover:bg-[#c01a0a]">Login</button>
        </div>
      </div>
    </div>
  )
}
