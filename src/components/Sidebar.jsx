import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Receipt,
  History,
  Users,
  Users2,
  BarChart3,
  Scissors,
  Package,
  Settings as SettingsIcon,
  Sparkles,
  AlarmClock,
  Crown,
  CalendarClock,
  Wallet,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { hasPageAccess, ROLE_LABELS } from '../utils/permissions.js'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, page: 'dashboard' },
  { to: '/new-bill', label: 'New Bill', icon: Receipt, page: 'new-bill' },
  { to: '/appointments', label: 'Appointments', icon: CalendarClock, badgeKey: 'pendingAppointments', page: 'appointments' },
  { to: '/history', label: 'Billing History', icon: History, page: 'history' },
  { to: '/clients', label: 'Clients', icon: Users, page: 'clients' },
  { to: '/memberships', label: 'Memberships', icon: Crown, page: 'memberships' },
  { to: '/staff', label: 'Staff', icon: Users2, page: 'staff' },
  { to: '/follow-ups', label: 'Follow-ups', icon: AlarmClock, page: 'follow-ups' },
  { to: '/reports', label: 'Reports', icon: BarChart3, page: 'reports' },
  { to: '/finance', label: 'Finance & Profit', icon: Wallet, page: 'finance' },
  { to: '/services', label: 'Services', icon: Scissors, page: 'services' },
  { to: '/products', label: 'Products', icon: Package, page: 'products' },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, page: 'settings' },
]

export default function Sidebar({ onNavigate }) {
  const { appointments, role } = useApp()
  const pendingAppointments = appointments.filter((a) => a.status === 'pending').length
  const visibleItems = NAV_ITEMS.filter((item) => hasPageAccess(role, item.page))

  return (
    <div className="flex flex-col h-full bg-ink text-cream">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-cream/10">
        <div className="w-9 h-9 rounded-full bg-brass/20 border border-brass/40 flex items-center justify-center shrink-0">
          <Scissors size={16} className="text-brass" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-base leading-tight truncate">Salon Billing</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-cream/40">Front Desk</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visibleItems.map(({ to, label, icon: Icon, end, badgeKey }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brass/15 text-brass'
                  : 'text-cream/70 hover:bg-cream/5 hover:text-cream'
              }`
            }
          >
            <Icon size={17} />
            {label}
            {badgeKey === 'pendingAppointments' && pendingAppointments > 0 && (
              <span className="ml-auto text-[10px] font-semibold bg-brass text-ink rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {pendingAppointments}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-cream/10">
        <span className="inline-block text-[10px] uppercase tracking-[0.15em] font-semibold bg-cream/10 text-cream/70 rounded-full px-2.5 py-1">
          {ROLE_LABELS[role] || role} role
        </span>
      </div>
    </div>
  )
}
