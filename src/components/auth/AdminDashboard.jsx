import { useState } from 'react'
import { useAuth } from './AuthProvider'
import { LOGO_OPTIONS, getSelectedLogo } from '../BrandLogos'

export default function AdminDashboard({ onBack }) {
  const { users, addUser, removeUser, updateUserRole, settings, updateSettings, activity, quotes } = useAuth()
  const [tab, setTab] = useState('users')
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'viewer', name: '' })

  const forumPosts = (() => { try { return JSON.parse(localStorage.getItem('welllogic_forum') || '[]') } catch { return [] } })()

  return (
    <div className="flex-1 flex flex-col bg-[#080810] overflow-hidden">
      <div className="px-6 py-4 bg-[#0c0c16] border-b border-[#1a1a2a] shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg text-white font-bold" style={{ fontFamily: "'Arial Black'" }}>⚙️ Admin Dashboard</h1>
            <p className="text-[11px] text-[#888]">User management, analytics, permissions, forum</p>
          </div>
          <button onClick={onBack} className="px-4 py-1.5 text-[11px] font-bold text-[#888] border border-[#333] rounded hover:text-white">← Back</button>
        </div>
      </div>

      <div className="flex gap-2 px-6 py-2 bg-[#0a0a14] border-b border-[#1a1a2a] shrink-0 overflow-x-auto">
        {['users', 'branding', 'analytics', 'forum', 'quotes', 'settings'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-[11px] font-bold capitalize ${tab === t ? 'bg-[#E8200C] text-white' : 'text-[#888] hover:text-white bg-[#111120] border border-[#2a2a3a]'}`}>{t}</button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* ═══ USERS ═══ */}
        {tab === 'users' && (
          <div className="max-w-[800px]">
            <h2 className="text-sm text-white font-bold mb-4">User Accounts ({users.length})</h2>
            <div className="space-y-1 mb-6">
              {users.map(u => (
                <div key={u.username} className="flex items-center gap-3 bg-[#111120] rounded p-3 border border-[#2a2a3a]">
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] text-white font-bold">{u.name || u.username}</span>
                    <span className="text-[9px] text-[#555] ml-2">@{u.username}</span>
                    {u.createdAt && <span className="text-[8px] text-[#444] ml-2">joined {new Date(u.createdAt).toLocaleDateString()}</span>}
                  </div>
                  <select value={u.role} onChange={e => updateUserRole(u.username, e.target.value)}
                    disabled={u.username === 'cody'}
                    className="bg-[#0a0a14] border border-[#333] rounded px-2 py-1 text-[10px] text-white outline-none">
                    <option value="viewer">Viewer</option>
                    <option value="tech">Tech</option>
                    <option value="admin">Admin</option>
                  </select>
                  {/* Quote access toggle */}
                  <label className="flex items-center gap-1 cursor-pointer" title="Can view quotes">
                    <input type="checkbox" checked={(settings.quoteViewers || []).includes(u.username) || u.role === 'admin'}
                      disabled={u.role === 'admin'}
                      onChange={e => {
                        const viewers = settings.quoteViewers || []
                        updateSettings('quoteViewers', e.target.checked ? [...viewers, u.username] : viewers.filter(v => v !== u.username))
                      }}
                      className="accent-[#E8200C]" />
                    <span className="text-[8px] text-[#888]">Quotes</span>
                  </label>
                  {u.username !== 'cody' && (
                    <button onClick={() => removeUser(u.username)} className="text-[9px] text-[#E8200C] hover:text-white">✕</button>
                  )}
                </div>
              ))}
            </div>
            <div className="bg-[#111120] rounded-lg border border-[#2a2a3a] p-4">
              <h3 className="text-[10px] text-[#E8200C] font-bold uppercase mb-3">Add User Manually</h3>
              <div className="grid grid-cols-4 gap-2 mb-2">
                <input type="text" placeholder="Name" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))}
                  className="bg-[#0a0a14] border border-[#333] rounded px-2 py-1.5 text-white text-[10px] outline-none" />
                <input type="text" placeholder="Username" value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))}
                  className="bg-[#0a0a14] border border-[#333] rounded px-2 py-1.5 text-white text-[10px] outline-none" />
                <input type="text" placeholder="Password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                  className="bg-[#0a0a14] border border-[#333] rounded px-2 py-1.5 text-white text-[10px] outline-none" />
                <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                  className="bg-[#0a0a14] border border-[#333] rounded px-2 py-1.5 text-white text-[10px] outline-none">
                  <option value="viewer">Viewer</option>
                  <option value="tech">Tech</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button onClick={() => { if (newUser.username && newUser.password) { addUser(newUser); setNewUser({ username: '', password: '', role: 'viewer', name: '' }) } }}
                className="px-4 py-1.5 text-[10px] font-bold bg-[#E8200C] text-white rounded">Add User</button>
            </div>
          </div>
        )}

        {/* ═══ BRANDING ═══ */}
        {tab === 'branding' && (
          <div className="max-w-[1000px]">
            <h2 className="text-sm text-white font-bold mb-2" style={{ fontFamily: "'Arial Black'" }}>Brand Logo Selection</h2>
            <p className="text-[11px] text-[#888] mb-6">Choose the active logo displayed across the app. The selected logo appears on the landing page and header.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {LOGO_OPTIONS.map(logo => {
                const isSelected = settings.selectedLogo === logo.id
                const Logo = logo.Full
                return (
                  <div key={logo.id}
                    className={`relative bg-[#0a0a14] rounded-xl border-2 p-6 transition-all cursor-pointer hover:scale-[1.02] ${isSelected ? 'border-[#E8200C] shadow-xl shadow-[#E8200C]/20' : 'border-[#2a2a3a] hover:border-[#555]'}`}
                    onClick={() => updateSettings('selectedLogo', logo.id)}>
                    {/* Selected badge */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 bg-[#E8200C] rounded text-[8px] text-white font-bold uppercase">Active</div>
                    )}

                    {/* Logo preview */}
                    <div className="flex items-center justify-center py-4 mb-4 bg-[#060609] rounded-lg min-h-[240px]">
                      <Logo size={180} />
                    </div>

                    {/* Info */}
                    <h3 className="text-[14px] text-white font-bold mb-1" style={{ fontFamily: "'Arial Black'" }}>{logo.name}</h3>
                    <p className="text-[10px] text-[#888] leading-relaxed">{logo.desc}</p>

                    {/* Select button */}
                    <button
                      onClick={e => { e.stopPropagation(); updateSettings('selectedLogo', logo.id) }}
                      className={`w-full mt-4 py-2 rounded-lg text-[11px] font-bold transition-all ${isSelected ? 'bg-[#E8200C] text-white' : 'bg-[#111120] border border-[#333] text-[#888] hover:text-white hover:border-[#E8200C]'}`}>
                      {isSelected ? '✓ Selected' : 'Select This Logo'}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Clear selection */}
            {settings.selectedLogo && (
              <button onClick={() => updateSettings('selectedLogo', null)}
                className="mt-4 px-4 py-2 text-[10px] text-[#888] border border-[#333] rounded hover:text-white hover:border-[#E8200C] transition-colors">
                Reset to Default (Text-Only Branding)
              </button>
            )}
          </div>
        )}

        {/* ═══ ANALYTICS ═══ */}
        {tab === 'analytics' && (
          <div className="max-w-[900px]">
            <h2 className="text-sm text-white font-bold mb-4">Analytics & Activity</h2>
            <div className="grid grid-cols-4 gap-3 mb-6">
              <StatCard label="Total Users" value={users.length} color="#E8200C" />
              <StatCard label="Forum Posts" value={forumPosts.length} color="#22c55e" />
              <StatCard label="Quotes" value={quotes.length} color="#f97316" />
              <StatCard label="Pipeline Value" value={`$${(quotes.reduce((s, q) => s + (Number(q.estimatedValue) || 0), 0) / 1000).toFixed(0)}K`} color="#4fc3f7" />
            </div>

            {/* User breakdown */}
            <div className="bg-[#111120] rounded-lg border border-[#2a2a3a] p-4 mb-4">
              <h3 className="text-[10px] text-[#E8200C] font-bold uppercase mb-2">Users by Role</h3>
              <div className="flex gap-4 text-[11px]">
                <span className="text-[#888]">Admins: <span className="text-white font-bold">{users.filter(u => u.role === 'admin').length}</span></span>
                <span className="text-[#888]">Tech: <span className="text-white font-bold">{users.filter(u => u.role === 'tech').length}</span></span>
                <span className="text-[#888]">Viewers: <span className="text-white font-bold">{users.filter(u => u.role === 'viewer').length}</span></span>
              </div>
            </div>

            {/* Activity log */}
            <div className="bg-[#111120] rounded-lg border border-[#2a2a3a] p-4">
              <h3 className="text-[10px] text-[#E8200C] font-bold uppercase mb-2">Activity Log ({activity.length} events)</h3>
              <div className="max-h-[400px] overflow-y-auto space-y-1">
                {activity.length === 0 ? (
                  <div className="text-[#555] text-[11px] py-4 text-center">No activity recorded yet.</div>
                ) : activity.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 border-b border-[#1a1a2a] last:border-0">
                    <span className="text-[9px] text-[#555] w-36 shrink-0">{new Date(a.timestamp).toLocaleString()}</span>
                    <span className="text-[10px] text-[#4fc3f7] font-bold w-28 shrink-0 truncate">{a.user}</span>
                    <span className="text-[10px] text-[#ccc]">{a.action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ FORUM ═══ */}
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
                  <div key={i} className="ml-3 mt-1 pl-2 border-l border-[#E8200C]/30 text-[10px]">
                    <span className="text-[#E8200C] font-bold">{r.author}</span>: <span className="text-[#aaa]">{r.text}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* ═══ QUOTES ═══ */}
        {tab === 'quotes' && (
          <div className="max-w-[800px]">
            <h2 className="text-sm text-white font-bold mb-4">Quote Pipeline ({quotes.length})</h2>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {['New', 'Quoted', 'Won', 'Lost'].map(s => (
                <div key={s} className="bg-[#111120] rounded p-3 text-center border border-[#2a2a3a]">
                  <div className="text-xl font-bold" style={{ fontFamily: "'Arial Black'", color: s === 'Won' ? '#22c55e' : s === 'Lost' ? '#E8200C' : '#f97316' }}>
                    {quotes.filter(q => q.status === s).length}
                  </div>
                  <div className="text-[9px] text-[#888]">{s}</div>
                </div>
              ))}
            </div>
            {quotes.map(q => (
              <div key={q.id} className="bg-[#111120] rounded p-3 mb-1 border border-[#2a2a3a] flex items-center gap-3 text-[11px]">
                <span className="text-white font-bold flex-1">{q.customerName}</span>
                <span className="text-[#888]">{q.padName}</span>
                <span className="text-[#22c55e] font-bold">{q.estimatedValue ? `$${Number(q.estimatedValue).toLocaleString()}` : '—'}</span>
                <span className="text-[#888]">{q.status}</span>
                <span className="text-[#555]">{new Date(q.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* ═══ SETTINGS ═══ */}
        {tab === 'settings' && (
          <div className="max-w-[500px]">
            <h2 className="text-sm text-white font-bold mb-4">Site Settings</h2>
            <div className="space-y-3">
              <SettingToggle label="Forum Public Access" desc={settings.forumPublic ? 'Anyone can view and post' : 'Login required'}
                value={settings.forumPublic} onChange={v => updateSettings('forumPublic', v)} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-[#111120] rounded-lg border border-[#2a2a3a] p-4 text-center">
      <div className="text-2xl font-bold" style={{ fontFamily: "'Arial Black'", color }}>{value}</div>
      <div className="text-[10px] text-[#888]">{label}</div>
    </div>
  )
}

function SettingToggle({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center gap-3 bg-[#111120] rounded p-3 border border-[#2a2a3a]">
      <div className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${value ? 'bg-[#22c55e]' : 'bg-[#333]'}`}
        onClick={() => onChange(!value)}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      <div><div className="text-[11px] text-white font-bold">{label}</div><div className="text-[9px] text-[#888]">{desc}</div></div>
    </div>
  )
}
