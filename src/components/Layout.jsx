import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, Plus } from 'lucide-react'
import Sidebar from './Sidebar.jsx'
import { useApp } from '../context/AppContext.jsx'

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { logout, settings, user } = useApp()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex bg-cream">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="fixed w-64 h-screen">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="no-print sticky top-0 z-30 bg-cream/90 backdrop-blur border-b border-black/5">
          <div className="flex items-center justify-between px-4 sm:px-8 h-16">
            <div className="flex items-center gap-3">
              <button className="lg:hidden p-2 -ml-2 text-ink" onClick={() => setMobileOpen(true)}>
                <Menu size={20} />
              </button>
              <div className="hidden sm:block">
                <p className="font-display text-lg text-ink leading-tight">{settings.salonName}</p>
                <p className="text-xs text-muted">{settings.tagline}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => navigate('/new-bill')} className="btn-brass py-2 px-3 sm:px-4">
                <Plus size={16} />
                <span className="hidden sm:inline">New Bill</span>
              </button>
              <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-black/10">
                <div className="w-8 h-8 rounded-full bg-plum text-cream flex items-center justify-center text-xs font-semibold">
                  {user?.email?.[0]?.toUpperCase() || 'A'}
                </div>
                <span className="text-sm font-medium text-ink">{user?.email}</span>
              </div>
              <button
                onClick={async () => {
                  await logout()
                  navigate('/login')
                }}
                className="p-2 text-muted hover:text-danger transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
