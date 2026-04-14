import { useState, useEffect } from 'react'

export default function AdminPanel({ user, onBack }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'tech' })
  const [formError, setFormError] = useState('')
  const [creating, setCreating] = useState(false)

  const token = localStorage.getItem('vc_token')
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { headers })
      if (!res.ok) throw new Error('Failed to load users')
      setUsers(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormError('')
    setCreating(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers,
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Failed to create user')
        return
      }
      setForm({ username: '', password: '', name: '', role: 'tech' })
      setShowForm(false)
      loadUsers()
    } catch {
      setFormError('Network error')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (username) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Failed to delete user')
        return
      }
      loadUsers()
    } catch {
      alert('Network error')
    }
  }

  const inputStyle = { background: '#080810', border: '1px solid #1e1e30' }
  const cardStyle = { background: '#11111e', borderColor: '#1e1e30' }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: 'linear-gradient(135deg, #080810 0%, #0d0d1f 100%)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-bold text-white">User Management</h1>
            <p className="text-slate-400 text-sm mt-1">Admin Panel</p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg text-sm text-slate-300 border transition hover:bg-white/5"
            style={{ borderColor: '#1e1e30' }}
          >
            Back to Creator
          </button>
        </div>

        {/* Create user button / form */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full mb-6 py-3 rounded-xl text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: '#E8200C' }}
          >
            + Create New User
          </button>
        ) : (
          <div className="rounded-2xl border p-6 mb-6" style={cardStyle}>
            <h2 className="text-sm font-semibold text-white mb-4">New User</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    required
                    className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-red-600"
                    style={inputStyle}
                    placeholder="jsmith"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-red-600"
                    style={inputStyle}
                    placeholder="John Smith"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-red-600"
                    style={inputStyle}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-red-600"
                    style={inputStyle}
                  >
                    <option value="tech">Tech</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {formError && (
                <p className="text-xs text-red-400 bg-red-950/40 rounded-lg px-3 py-2 border border-red-900/40">
                  {formError}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-50"
                  style={{ background: '#E8200C' }}
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setFormError('') }}
                  className="px-5 py-2 rounded-lg text-sm text-slate-400 border transition hover:bg-white/5"
                  style={{ borderColor: '#1e1e30' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* User list */}
        {loading ? (
          <p className="text-slate-400 text-sm text-center py-8">Loading users...</p>
        ) : error ? (
          <p className="text-red-400 text-sm text-center py-8">{error}</p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.username}
                className="flex items-center justify-between rounded-xl border px-5 py-4"
                style={cardStyle}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: u.role === 'admin' ? '#E8200C' : '#1e3a5f' }}
                  >
                    {(u.name || u.username).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{u.name || u.username}</p>
                    <p className="text-xs text-slate-500">@{u.username} &middot; {u.role}</p>
                  </div>
                </div>
                {u.username !== user.username && (
                  <button
                    onClick={() => handleDelete(u.username)}
                    className="text-xs text-slate-500 hover:text-red-400 transition px-3 py-1 rounded border border-transparent hover:border-red-900/40"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
