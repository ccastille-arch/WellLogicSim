import { useState, useEffect } from 'react'
import { useAuth } from '../AuthProvider'
import { api } from '../../../services/api'

const TILE_LABELS = {
  admin: 'Admin', livedata: 'Live Data', autopilot: 'Presentation', marketing: 'Marketing',
  sales: 'Sales Demo', technical: 'Tech Docs', quote: 'Quote', detechtion_launchpad: 'Detechtion',
  mlink_connect: 'M-Link', simulator: 'Simulator', pipeline: 'Pipeline',
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4 text-center">
      <div className="text-2xl font-bold" style={{ color, fontFamily: "'Arial Black'" }}>{value}</div>
      <div className="text-[9px] text-[#888] mt-1">{label}</div>
    </div>
  )
}

export default function AnalyticsTab() {
  const { activity } = useAuth()
  const [summary, setSummary] = useState(null)
  const [tileUsage, setTileUsage] = useState([])
  const [userStats, setUserStats] = useState([])
  const [days, setDays] = useState(30)

  useEffect(() => {
    api.analytics.summary().then(setSummary).catch(() => {})
    api.analytics.userActivity().then(setUserStats).catch(() => {})
  }, [])

  useEffect(() => {
    api.analytics.tileUsage(days).then(setTileUsage).catch(() => {})
  }, [days])

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Users" value={summary.totalUsers} color="#3b82f6" />
          <StatCard label="Active (7d)" value={summary.activeUsers7d} color="#22c55e" />
          <StatCard label="Total Quotes" value={summary.totalQuotes} color="#f97316" />
          <StatCard label="Pipeline Value" value={`$${(summary.pipelineValue || 0).toLocaleString()}`} color="#E8200C" />
        </div>
      )}

      {/* Tile usage */}
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[12px] font-bold text-white">Tile Usage</h3>
          <div className="flex gap-1">
            {[7, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold ${days === d ? 'bg-[#E8200C] text-white' : 'text-[#888] border border-[#1e1e30]'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        {tileUsage.length === 0 ? (
          <p className="text-[10px] text-[#555]">No tile usage data yet</p>
        ) : (
          <div className="space-y-1.5">
            {tileUsage.map(t => {
              const max = Math.max(...tileUsage.map(x => parseInt(x.visits)))
              const pct = max ? (parseInt(t.visits) / max) * 100 : 0
              return (
                <div key={t.tile_id} className="flex items-center gap-2">
                  <span className="text-[10px] text-[#888] w-24 shrink-0 truncate">{TILE_LABELS[t.tile_id] || t.tile_id}</span>
                  <div className="flex-1 h-4 rounded bg-[#1a1a2a] overflow-hidden">
                    <div className="h-full rounded bg-[#E8200C]/70" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[9px] text-white w-12 text-right">{t.visits} <span className="text-[#555]">({t.unique_users}u)</span></span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* User activity */}
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <h3 className="text-[12px] font-bold text-white mb-3">User Activity</h3>
        {userStats.length === 0 ? (
          <p className="text-[10px] text-[#555]">No user activity data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-[#888] text-left border-b border-[#1e1e30]">
                  <th className="pb-2 font-bold">User</th>
                  <th className="pb-2 font-bold">Role</th>
                  <th className="pb-2 font-bold">Actions</th>
                  <th className="pb-2 font-bold">Top Tile</th>
                  <th className="pb-2 font-bold">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {userStats.map(u => (
                  <tr key={u.username} className="border-b border-[#1e1e30]/50">
                    <td className="py-1.5 text-white font-medium">{u.name || u.username}</td>
                    <td className="py-1.5 text-[#888]">{u.role_id || '—'}</td>
                    <td className="py-1.5 text-white">{u.total_actions}</td>
                    <td className="py-1.5 text-[#888]">{TILE_LABELS[u.top_tile] || u.top_tile || '—'}</td>
                    <td className="py-1.5 text-[#555]">{u.last_active ? new Date(u.last_active).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity log */}
      <div className="rounded-xl border border-[#1e1e30] bg-[#0c0c18] p-4">
        <h3 className="text-[12px] font-bold text-white mb-3">Recent Activity</h3>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {activity.slice(0, 100).map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] py-0.5">
              <span className="text-[#555] w-28 shrink-0">{new Date(a.timestamp).toLocaleString()}</span>
              <span className="text-white font-medium w-20 shrink-0 truncate">{a.user}</span>
              {a.tile_id && (
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#1a1a2a] text-[#888] shrink-0">
                  {TILE_LABELS[a.tile_id] || a.tile_id}
                </span>
              )}
              <span className="text-[#888] truncate">{a.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
