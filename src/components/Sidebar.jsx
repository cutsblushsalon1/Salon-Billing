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
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/new-bill', label: 'New Bill', icon: Receipt },
  { to: '/appointments', label: 'Appointments', icon: CalendarClock, badgeKey: 'pendingAppointments' },
  { to: '/history', label: 'Billing History', icon: History },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/memberships', label: 'Memberships', icon: Crown },
  { to: '/staff', label: 'Staff', icon: Users2 },
  { to: '/follow-ups', label: 'Follow-ups', icon: AlarmClock },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/services', label: 'Services', icon: Scissors },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

export default function Sidebar({ onNavigate }) {
  const { appointments } = useApp()
  const pendingAppointments = appointments.filter((a) => a.status === 'pending').length

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
        {NAV_ITEMS.map(({ to, label, icon: Icon, end, badgeKey }) => (
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

      <div className="px-6 py-5 border-t border-cream/10">
        <div className="flex items-center gap-2 text-brass/80 text-xs">
          <Sparkles size={13} />
          <span>Built for chair-side speed</span>
        </div>
      </div>
    </div>
  )
}
