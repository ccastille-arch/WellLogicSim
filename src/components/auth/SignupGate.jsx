import { useState } from 'react'
import { useAuth } from './AuthProvider'

// Simple signup gate — first visit requires first + last name
// First name = username, Last name = password (simple, easy)
// Returning users: same first + last logs them back in

export default function SignupGate() {
  const { signup, login } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState('signup') // signup | admin

  // Admin login fields
  const [adminUser, setAdminUser] = useState('')
  const [adminPass, setAdminPass] = useState('')

  const handleSignup = () => {
    if (!firstName.trim() || !lastName.trim()) { setError('Please enter your first and last name'); return }
    const result = signup(firstName.trim(), lastName.trim())
    if (!result.success) setError(result.error)
  }

  const handleAdminLogin = () => {
    const result = login(adminUser, adminPass)
    if (!result.success) { setError(result.error); setAdminPass('') }
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-[#080810]">
      <div className="w-[440px] max-w-full px-4">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="text-3xl tracking-tight mb-1" style={{ fontFamily: "'Arial Black'", fontStyle: 'italic', color: '#E8200C' }}>
            FieldTune™
          </div>
          <div className="text-xl text-white font-bold mb-1" style={{ fontFamily: "'Arial Black'" }}>
            WellLogic™
          </div>
          <div className="text-[11px] text-[#888]">Automated Gas Lift Injection Optimization</div>
          <div className="w-16 h-0.5 bg-[#E8200C] mx-auto mt-3" />
        </div>

        {mode === 'signup' ? (
          <div className="bg-[#111118] rounded-xl border border-[#222] p-6">
            <h2 className="text-sm text-white font-bold mb-1" style={{ fontFamily: "'Arial Black'" }}>Welcome</h2>
            <p className="text-[11px] text-[#888] mb-5">Enter your name to get started.</p>

            <input type="text" value={firstName} onChange={e => { setFirstName(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && document.getElementById('lastname-input')?.focus()}
              placeholder="First Name" autoFocus
              className="w-full bg-[#0a0a14] border border-[#333] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#E8200C] mb-3" />

            <input type="text" id="lastname-input" value={lastName}
              onChange={e => { setLastName(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSignup()}
              placeholder="Last Name"
              className="w-full bg-[#0a0a14] border border-[#333] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#E8200C] mb-4" />

            {error && <p className="text-[#E8200C] text-[11px] mb-3">{error}</p>}

            <button onClick={handleSignup}
              className="w-full py-3 bg-[#E8200C] hover:bg-[#c01a0a] text-white font-bold rounded-lg text-sm transition-colors"
              style={{ fontFamily: "'Arial Black'" }}>
              Continue →
            </button>

            <div className="text-center mt-4">
              <button onClick={() => { setMode('admin'); setError('') }}
                className="text-[10px] text-[#555] hover:text-[#888]">
                Admin / Tech Team Login →
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#111118] rounded-xl border border-[#222] p-6">
            <h2 className="text-sm text-white font-bold mb-1" style={{ fontFamily: "'Arial Black'" }}>🔐 Team Login</h2>
            <p className="text-[11px] text-[#888] mb-5">Admin or Tech Team credentials.</p>

            <input type="text" value={adminUser} onChange={e => { setAdminUser(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && document.getElementById('admin-pass')?.focus()}
              placeholder="Username" autoFocus
              className="w-full bg-[#0a0a14] border border-[#333] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#E8200C] mb-3" />

            <input type="password" id="admin-pass" value={adminPass}
              onChange={e => { setAdminPass(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
              placeholder="Password"
              className="w-full bg-[#0a0a14] border border-[#333] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-[#E8200C] mb-4" />

            {error && <p className="text-[#E8200C] text-[11px] mb-3">{error}</p>}

            <button onClick={handleAdminLogin}
              className="w-full py-3 bg-[#E8200C] hover:bg-[#c01a0a] text-white font-bold rounded-lg text-sm transition-colors"
              style={{ fontFamily: "'Arial Black'" }}>
              Login
            </button>

            <div className="text-center mt-4">
              <button onClick={() => { setMode('signup'); setError('') }}
                className="text-[10px] text-[#555] hover:text-[#888]">
                ← Back to signup
              </button>
            </div>
          </div>
        )}

        <div className="text-center mt-6 text-[9px] text-[#333]">Service Compression</div>
      </div>
    </div>
  )
}
