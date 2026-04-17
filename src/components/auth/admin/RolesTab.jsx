import { useState } from 'react'
import { useAuth } from '../AuthProvider'

// Friendly labels for permissions
const PERM_LABELS = {
  'tile:admin': 'Admin Dashboard',
  'tile:livedata': 'Live Field Data',
  'tile:autopilot': 'Customer Presentation',
  'tile:marketing': 'Marketing Material',
  'tile:sales': 'Sales Demo',
  'tile:technical': 'Technical Docs',
  'tile:quote': 'Request a Quote',
  'tile:detechtion_launchpad': 'Detechtion Launchpad',
  'tile:mlink_connect': 'M-Link Connect',
  'tile:simulator': 'Tech Simulator',
  'tile:pipeline': 'Sales Pipeline',
  'manage:users': 'Manage Users',
  'manage:roles': 'Manage Roles',
  'manage:settings': 'Manage Settings',
  'view:analytics': 'View Analytics',
  'manage:quotes': 'Manage Quotes',
}

export default function RolesTab() {
  const { roles, allPermissions, users, createRole, updateRole, deleteRole } = useAuth()
  const [editingId, setEditingId] = useState(null)
  const [editPerms, setEditPerms] = useState([])
  const [editName, setEditName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newId, setNewId] = useState('')
  const [newName, setNewName] = useState('')
  const [newPerms, setNewPerms] = useState([])
  const [error, setError] = useState('')

  const tilePerms = allPermissions.filter(p => p.startsWith('tile:'))
  const funcPerms = allPermissions.filter(p => !p.startsWith('tile:'))

  const startEdit = (role) => {
    setEditingId(role.id)
    setEditPerms([...role.permissions])
    setEditName(role.name)
  }

  const saveEdit = async () => {
    try {
      await updateRole(editingId, { name: editName, permissions: editPerms })
      setEditingId(null)
    } catch (err) { setError(err.message) }
  }

  const handleCreate = async () => {
    if (!newId || !newName) return
    setError('')
    try {
      await createRole({ id: newId.toLowerCase().replace(/\s+/g, '_'), name: newName, permissions: newPerms })
      setShowCreate(false)
      setNewId('')
      setNewName('')
      setNewPerms([])
    } catch (err) { setError(err.message) }
  }

  const togglePerm = (perms, setPerms, perm) => {
    setPerms(perms.includes(perm) ? perms.filter(p => p !== perm) : [...perms, perm])
  }

  const userCountForRole = (roleId) => users.filter(u => (u.role_id || u.role) === roleId).length

  const PermCheckboxes = ({ perms, setPerms, disabled }) => (
    <div className="space-y-3">
      <div>
        <p className="text-[9px] text-[#888] font-bold uppercase mb-1.5">Tile Access</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          {tilePerms.map(p => (
            <label key={p} className="flex items-center gap-1.5 text-[10px] text-white cursor-pointer">
              <input type="checkbox" checked={perms.includes(p)} disabled={disabled}
                onChange={() => togglePerm(perms, setPerms, p)}
                className="accent-[#D32028]" />
              {PERM_LABELS[p] || p}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[9px] text-[#888] font-bold uppercase mb-1.5">Functional</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
          {funcPerms.map(p => (
            <label key={p} className="flex items-center gap-1.5 text-[10px] text-white cursor-pointer">
              <input type="checkbox" checked={perms.includes(p)} disabled={disabled}
                onChange={() => togglePerm(perms, setPerms, p)}
                className="accent-[#D32028]" />
              {PERM_LABELS[p] || p}
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {/* Create role */}
      {!showCreate ? (
        <button onClick={() => setShowCreate(true)}
          className="w-full mb-4 py-2.5 rounded-xl text-[11px] font-bold text-white bg-[#D32028] hover:opacity-90">
          + Create New Role
        </button>
      ) : (
        <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-[#888] mb-1 block">Role ID (slug)</label>
              <input className="w-full rounded-lg px-3 py-2 text-[11px] text-white bg-[#05233E] border border-[#1e1e30]"
                value={newId} onChange={e => setNewId(e.target.value)} placeholder="field_tech" />
            </div>
            <div>
              <label className="text-[9px] text-[#888] mb-1 block">Display Name</label>
              <input className="w-full rounded-lg px-3 py-2 text-[11px] text-white bg-[#05233E] border border-[#1e1e30]"
                value={newName} onChange={e => setNewName(e.target.value)} placeholder="Field Tech" />
            </div>
          </div>
          <PermCheckboxes perms={newPerms} setPerms={setNewPerms} disabled={false} />
          {error && <p className="text-[10px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 rounded-lg text-[11px] font-bold text-white bg-[#D32028]">Create Role</button>
            <button onClick={() => { setShowCreate(false); setError('') }}
              className="px-4 py-2 rounded-lg text-[11px] text-[#888] border border-[#1e1e30]">Cancel</button>
          </div>
        </div>
      )}

      {/* Role list */}
      <div className="space-y-2">
        {roles.map(role => (
          <div key={role.id} className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {editingId === role.id ? (
                  <input className="rounded px-2 py-0.5 text-[12px] font-bold text-white bg-[#05233E] border border-[#1e1e30] w-32"
                    value={editName} onChange={e => setEditName(e.target.value)} />
                ) : (
                  <span className="text-[12px] font-bold text-white">{role.name}</span>
                )}
                {role.is_system && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#1e1e30] text-[#888] uppercase font-bold">System</span>
                )}
                <span className="text-[9px] text-[#555]">{role.permissions.length} perms &middot; {userCountForRole(role.id)} users</span>
              </div>
              <div className="flex items-center gap-2">
                {role.id !== 'admin' && (
                  editingId === role.id ? (
                    <>
                      <button onClick={saveEdit} className="text-[9px] text-[#22c55e] font-bold">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-[9px] text-[#888]">Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(role)} className="text-[9px] text-[#3b82f6]">Edit</button>
                  )
                )}
                {!role.is_system && (
                  <button onClick={() => confirm(`Delete role "${role.name}"? Users will be moved to Viewer.`) && deleteRole(role.id)}
                    className="text-[9px] text-[#555] hover:text-red-400">Delete</button>
                )}
              </div>
            </div>

            {/* Expanded permissions editor */}
            {editingId === role.id && (
              <div className="mt-3 pl-2">
                <PermCheckboxes perms={editPerms} setPerms={setEditPerms} disabled={false} />
              </div>
            )}

            {/* Collapsed permission badges */}
            {editingId !== role.id && (
              <div className="flex flex-wrap gap-1 mt-1">
                {role.permissions.slice(0, 8).map(p => (
                  <span key={p} className="text-[8px] px-1.5 py-0.5 rounded bg-[#293C5B] text-[#888]">
                    {PERM_LABELS[p] || p}
                  </span>
                ))}
                {role.permissions.length > 8 && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#293C5B] text-[#888]">
                    +{role.permissions.length - 8} more
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
