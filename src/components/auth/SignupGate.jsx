import { useState } from 'react'
import { useAuth } from './AuthProvider'
import WellLogicLogo from '../WellLogicBrand'

// First name becomes username, last name becomes password.
// Entering the same name again signs the user back in.
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
    <div className="flex-1 flex flex-col bg-[#080810] overflow-auto py-10">
      <div className="w-[440px] max-w-full px-4 mx-auto my-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <WellLogicLogo size={110} />
          </div>
          <div className="text-[11px] text-[#888]">Automated Gas Lift Injection Optimization</div>
          <div className="w-16 h-0.5 bg-[#E8200C] mx-auto mt-3" />
        </div>

        {mode === 'signup' ? (
          <div className="bg-[#111118] rounded-xl border border-[#222] p-6">
            <h2 className="text-sm text-white font-bold mb-1" style={{ fontFamily: "'Arial Black'" }}>Welcome</h2>
            <p className="text-[11px] text-[#888] mb-2">Anyone can log in with their name.</p>
            <p className="text-[11px] text-[#666] mb-5">First name becomes your username. Last name becomes your password. Enter the same name later to sign back in.</p>

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

            <button onClick={handleSignup} disabled={submitting}
              className="w-full py-3 bg-[#E8200C] hover:bg-[#c01a0a] disabled:opacity-60 text-white font-bold rounded-lg text-sm transition-colors"
              style={{ fontFamily: "'Arial Black'" }}>
              {submitting ? 'Connecting...' : 'Continue'}
            </button>

            <div className="text-center mt-4">
              <button onClick={() => { setMode('admin'); setError(''); setSubmitting(false) }}
                className="text-[10px] text-[#555] hover:text-[#888]">
                Admin / Tech Team Login
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#111118] rounded-xl border border-[#222] p-6">
            <h2 className="text-sm text-white font-bold mb-1" style={{ fontFamily: "'Arial Black'" }}>Team Login</h2>
            <p className="text-[11px] text-[#888] mb-5">Use this only for dedicated admin or tech credentials like cody / Brayden25!.</p>

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

            <button onClick={handleAdminLogin} disabled={submitting}
              className="w-full py-3 bg-[#E8200C] hover:bg-[#c01a0a] disabled:opacity-60 text-white font-bold rounded-lg text-sm transition-colors"
              style={{ fontFamily: "'Arial Black'" }}>
              {submitting ? 'Connecting...' : 'Login'}
            </button>

            <div className="text-center mt-4">
              <button onClick={() => { setMode('signup'); setError(''); setSubmitting(false) }}
                className="text-[10px] text-[#555] hover:text-[#888]">
                Back to name login
              </button>
            </div>
          </div>
        )}

        <div className="text-center mt-6 text-[9px] text-[#333]">Service Compression</div>
      </div>
    </div>
  )
}
