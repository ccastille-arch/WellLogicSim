import { useState } from 'react'
import { useAuth } from './AuthProvider'

export default function AdminDashboard({ onBack }) {
  const { users, addUser, removeUser, settings, updateSettings } = useAuth()
  const [tab, setTab] = useState('users')
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'viewer', name: '' })

  const handleAddUser = () => {
    if (!newUser.username || !newUser.password) return
    addUser(newUser)
    setNewUser({ username: '', password: '', role: 'viewer', name: '' })
  }

  // Forum posts for admin view
  const forumPosts = (() => { try { return JSON.parse(localStorage.getItem('welllogic_forum') || '[]') } catch { return [] } })()

  return (
    <div className="flex-1 flex flex-col bg-[#080810] overflow-hidden">
      <div className="px-6 py-4 bg-[#0c0c16] border-b border-[#1a1a2a] shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>⚙️ Admin Dashboard</h1>
            <p className="text-[11px] text-[#888]">User management, forum moderation, settings</p>
          </div>
          <button onClick={onBack} className="px-4 py-1.5 text-[11px] font-bold text-[#888] border border-[#333] rounded hover:text-white">← Back</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 py-2 bg-[#0a0a14] border-b border-[#1a1a2a] shrink-0">
        {['users', 'forum', 'settings', 'analytics'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-[11px] font-bold capitalize transition-colors ${
              tab === t ? 'bg-[#E8200C] text-white' : 'text-[#888] hover:text-white bg-[#111120] border border-[#2a2a3a]'
            }`}>{t}</button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {tab === 'users' && (
          <div className="max-w-[700px]">
            <h2 className="text-sm text-white font-bold mb-4">User Accounts</h2>
            {/* Existing users */}
            <div className="space-y-2 mb-6">
              {users.map(u => (
                <div key={u.username} className="flex items-center gap-3 bg-[#111120] rounded p-3 border border-[#2a2a3a]">
                  <div className="flex-1">
                    <span className="text-[12px] text-white font-bold">{u.name || u.username}</span>
                    <span className="text-[10px] text-[#888] ml-2">@{u.username}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                    u.role === 'admin' ? 'bg-[#E8200C]/20 text-[#E8200C]' : u.role === 'tech' ? 'bg-[#4fc3f7]/20 text-[#4fc3f7]' : 'bg-[#888]/20 text-[#888]'
                  }`}>{u.role}</span>
                  {u.username !== 'cody' && (
                    <button onClick={() => removeUser(u.username)} className="text-[9px] text-[#E8200C] hover:text-white">Remove</button>
                  )}
                </div>
              ))}
            </div>
            {/* Add user form */}
            <div className="bg-[#111120] rounded-lg border border-[#2a2a3a] p-4">
              <h3 className="text-[11px] text-[#E8200C] font-bold uppercase mb-3">Add New User</h3>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input type="text" placeholder="Name" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))}
                  className="bg-[#0a0a14] border border-[#333] rounded px-2 py-1.5 text-white text-[11px] outline-none" />
                <input type="text" placeholder="Username" value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))}
                  className="bg-[#0a0a14] border border-[#333] rounded px-2 py-1.5 text-white text-[11px] outline-none" />
                <input type="text" placeholder="Password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                  className="bg-[#0a0a14] border border-[#333] rounded px-2 py-1.5 text-white text-[11px] outline-none" />
                <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                  className="bg-[#0a0a14] border border-[#333] rounded px-2 py-1.5 text-white text-[11px] outline-none">
                  <option value="viewer">Viewer</option>
                  <option value="tech">Tech Team</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button onClick={handleAddUser} className="px-4 py-1.5 text-[10px] font-bold bg-[#E8200C] text-white rounded hover:bg-[#c01a0a]">Add User</button>
            </div>
          </div>
        )}

        {tab === 'forum' && (
          <div className="max-w-[700px]">
            <h2 className="text-sm text-white font-bold mb-4">Forum Posts ({forumPosts.length})</h2>
            {forumPosts.length === 0 ? (
              <div className="text-[#555] text-center py-10">No forum posts yet.</div>
            ) : forumPosts.map(post => (
              <div key={post.id} className="bg-[#111120] rounded-lg border border-[#2a2a3a] p-3 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-white font-bold">{post.name}</span>
                  <span className="text-[9px] text-[#555]">{new Date(post.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-[#ccc] mt-1">{post.comment}</p>
                {post.replies?.map((r, i) => (
                  <div key={i} className="ml-3 mt-1 pl-2 border-l border-[#E8200C]/30">
                    <span className="text-[9px] text-[#E8200C] font-bold">{r.author}</span>
                    <p className="text-[10px] text-[#aaa]">{r.text}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab === 'settings' && (
          <div className="max-w-[500px]">
            <h2 className="text-sm text-white font-bold mb-4">Site Settings</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 bg-[#111120] rounded p-3 border border-[#2a2a3a] cursor-pointer">
                <div className={`w-10 h-5 rounded-full relative transition-colors ${settings.forumPublic ? 'bg-[#22c55e]' : 'bg-[#333]'}`}
                  onClick={() => updateSettings('forumPublic', !settings.forumPublic)}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${settings.forumPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <div>
                  <div className="text-[11px] text-white font-bold">Forum Public Access</div>
                  <div className="text-[9px] text-[#888]">{settings.forumPublic ? 'Anyone can view and post' : 'Login required to access forum'}</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {tab === 'analytics' && (
          <div className="max-w-[700px]">
            <h2 className="text-sm text-white font-bold mb-4">Analytics</h2>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-[#111120] rounded-lg border border-[#2a2a3a] p-4 text-center">
                <div className="text-2xl text-[#E8200C] font-bold" style={{ fontFamily: "'Arial Black'" }}>{users.length}</div>
                <div className="text-[10px] text-[#888]">Total Users</div>
              </div>
              <div className="bg-[#111120] rounded-lg border border-[#2a2a3a] p-4 text-center">
                <div className="text-2xl text-[#22c55e] font-bold" style={{ fontFamily: "'Arial Black'" }}>{forumPosts.length}</div>
                <div className="text-[10px] text-[#888]">Forum Posts</div>
              </div>
              <div className="bg-[#111120] rounded-lg border border-[#2a2a3a] p-4 text-center">
                <div className="text-2xl text-[#4fc3f7] font-bold" style={{ fontFamily: "'Arial Black'" }}>{forumPosts.reduce((s, p) => s + (p.replies?.length || 0), 0)}</div>
                <div className="text-[10px] text-[#888]">Replies</div>
              </div>
            </div>
            <p className="text-[11px] text-[#555]">Full analytics (page views, demo engagement, session tracking) coming soon.</p>
          </div>
        )}
      </div>
    </div>
  )
}
