import { useState } from 'react'
import { useAuth } from './AuthProvider'
import UsersTab from './admin/UsersTab'
import RolesTab from './admin/RolesTab'
import AnalyticsTab from './admin/AnalyticsTab'
import SettingsTab from './admin/SettingsTab'
import DemoTab from './admin/DemoTab'
import ConversionTab from './admin/ConversionTab'
import LogoTab from './admin/LogoTab'

const TABS = [
  { id: 'users',     label: 'Users',     perm: 'manage:users' },
  { id: 'roles',     label: 'Roles',     perm: 'manage:roles' },
  { id: 'analytics', label: 'Analytics', perm: 'view:analytics' },
  { id: 'settings',  label: 'Settings',  perm: 'manage:settings' },
  { id: 'demo',      label: 'Demo',      perm: 'manage:settings' },
  { id: 'formulas',  label: 'Formulas',  perm: 'manage:settings' },
  { id: 'logos',     label: 'Logos',     perm: 'manage:settings' },
]

export default function AdminDashboard({ onBack }) {
  const { hasPermission } = useAuth()
  const visibleTabs = TABS.filter(t => hasPermission(t.perm))
  const [tab, setTab] = useState(visibleTabs[0]?.id || 'users')

  return (
    <div className="flex-1 flex flex-col bg-[#05233E] overflow-auto">
      {/* Header */}
      <div className="shrink-0 px-5 py-4 border-b border-[#293C5B] bg-[#0c0c18]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: "'Montserrat'" }}>Admin Dashboard</h1>
            <p className="text-[10px] text-[#888]">User management, roles, analytics, settings & demo tools</p>
          </div>
          <button onClick={onBack}
            className="px-4 py-2 rounded-lg text-[11px] text-[#888] border border-[#1e1e30] hover:bg-white/5">
            Back
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {visibleTabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                tab === t.id
                  ? 'bg-[#D32028] text-white'
                  : 'text-[#888] hover:text-white hover:bg-white/5'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        <div className="max-w-4xl mx-auto">
          {tab === 'users'    && <UsersTab />}
          {tab === 'roles'    && <RolesTab />}
          {tab === 'analytics'&& <AnalyticsTab />}
          {tab === 'settings' && <SettingsTab />}
          {tab === 'demo'     && <DemoTab />}
          {tab === 'formulas' && <ConversionTab />}
          {tab === 'logos'    && <LogoTab />}
        </div>
      </div>
    </div>
  )
}
