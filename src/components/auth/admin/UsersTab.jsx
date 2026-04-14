import { useState } from 'react'
import { useAuth } from '../AuthProvider'

export default function UsersTab() {
  const { users, roles, addUser, removeUser, updateUserRole, updateUserName, resetUserPassword } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', name: '', role_id: 'viewer' })
  const [editingName, setEditingName] = useState(null)
  const [nameValue, setNameValue] = useState('')
  const [resetPw, setResetPw] = useState(null)
  const [pwValue, setPwValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await addUser({ ...form, username: form.username.toLowerCase() })
      setForm({ username: '', password: '', name: '', role_id: 'viewer' })
      setShowCreate(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleSaveName = async (username) => {
    await updateUserName(username, nameValue)
    setEditingName(null)
  }

  const handleResetPw = async (username) => {
    if (!pwValue) return
    await resetUserPassword(username, pwValue)
    setResetPw(null)
    setPwValue('')
  }

  const inputCls = "w-full rounded-lg px-3 py-2 text-[11px] text-white outline-none focus:ring-1 focus:ring-[#E8200C] bg-[#080810] border border-[#1e1e30]"

  return (
    <div>
      {/* Create user */}
      {!showCreate ? (
        <button onClick={() => setShowCreate(true)}
          className="w-full mb-4 py-2.5 rounded-xl text-[11px] font-bold text-white bg-[#E8200C] hover:opacity-90">
          + Create New User
        </button>
      ) : (
        <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4 mb-4">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#888] mb-1 block">Username</label>
                <input className={inputCls} value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
              </div>
              <div>
                <label className="text-[9px] text-[#888] mb-1 block">Display Name</label>
                <input className={inputCls} value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] text-[#888] mb-1 block">Password</label>
                <input type="password" className={inputCls} value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              </div>
              <div>
                <label className="text-[9px] text-[#888] mb-1 block">Role</label>
                <select className={inputCls} value={form.role_id} onChange={e => setForm({...form, role_id: e.target.value})}>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-[10px] text-red-400">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg text-[11px] font-bold text-white bg-[#E8200C] disabled:opacity-50">
                {busy ? 'Creating...' : 'Create'}
              </button>
              <button type="button" onClick={() => { setShowCreate(false); setError('') }}
                className="px-4 py-2 rounded-lg text-[11px] text-[#888] border border-[#1e1e30]">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* User list */}
      <div className="space-y-2">
        {users.map(u => (
          <div key={u.username} className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ background: u.role_id === 'admin' ? '#E8200C' : u.role_id === 'tech' ? '#3b82f6' : '#374151' }}>
                  {(u.name || u.username).charAt(0).toUpperCase()}
                </div>
                <div>
                  {editingName === u.username ? (
                    <div className="flex items-center gap-1">
                      <input className="rounded px-2 py-0.5 text-[11px] text-white bg-[#080810] border border-[#1e1e30] w-32"
                        value={nameValue} onChange={e => setNameValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveName(u.username)} autoFocus />
                      <button onClick={() => handleSaveName(u.username)} className="text-[9px] text-[#22c55e]">Save</button>
                      <button onClick={() => setEditingName(null)} className="text-[9px] text-[#888]">Cancel</button>
                    </div>
                  ) : (
                    <p className="text-[12px] font-semibold text-white cursor-pointer hover:text-[#E8200C]"
                      onClick={() => { setEditingName(u.username); setNameValue(u.name || u.username) }}>
                      {u.name || u.username}
                    </p>
                  )}
                  <p className="text-[9px] text-[#555]">@{u.username} &middot; {u.role_name || u.role_id || u.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {u.username !== 'cody' && (
                  <select className="rounded px-2 py-1 text-[10px] text-white bg-[#080810] border border-[#1e1e30]"
                    value={u.role_id || u.role}
                    onChange={e => updateUserRole(u.username, e.target.value)}>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                )}
                <button onClick={() => { setResetPw(u.username); setPwValue('') }}
                  className="text-[9px] text-[#f97316] hover:text-white">Reset PW</button>
                {u.username !== 'cody' && (
                  <button onClick={() => confirm(`Delete ${u.username}?`) && removeUser(u.username)}
                    className="text-[9px] text-[#555] hover:text-red-400">Delete</button>
                )}
              </div>
            </div>

            {/* Reset password inline */}
            {resetPw === u.username && (
              <div className="mt-2 flex items-center gap-2 pl-11">
                <input type="password" placeholder="New password"
                  className="rounded px-2 py-1 text-[10px] text-white bg-[#080810] border border-[#1e1e30] w-40"
                  value={pwValue} onChange={e => setPwValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleResetPw(u.username)} autoFocus />
                <button onClick={() => handleResetPw(u.username)} className="text-[9px] text-[#22c55e] font-bold">Save</button>
                <button onClick={() => setResetPw(null)} className="text-[9px] text-[#888]">Cancel</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
