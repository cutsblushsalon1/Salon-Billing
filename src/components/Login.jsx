import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Scissors, Lock, User, Eye, EyeOff } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

export default function Login() {
  const { login, settings } = useApp()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const ok = login(username.trim(), password)
    if (ok) {
      navigate('/')
    } else {
      setError('Incorrect username or password.')
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-cream">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-ink overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, #C79A4B 0px, #C79A4B 1px, transparent 1px, transparent 64px)',
          }}
        />
        <div className="relative z-10 flex flex-col justify-between p-14 text-cream w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brass/20 border border-brass/40 flex items-center justify-center">
              <Scissors size={18} className="text-brass" />
            </div>
            <span className="font-display text-lg tracking-wide">{settings.salonName}</span>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-brass mb-6">Front Desk</p>
            <h1 className="font-display text-6xl leading-[1.05] mb-6">
              Every chair,<br />every bill,<br /><span className="italic text-brass">one ledger.</span>
            </h1>
            <p className="text-cream/60 max-w-sm leading-relaxed">
              Sign in to open the day's book — take bookings to bills in seconds, track every client's
              chair time, and close the register with confidence.
            </p>
          </div>

          <p className="text-cream/40 text-xs font-mono">{settings.tagline}</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-full bg-plum/10 border border-plum/20 flex items-center justify-center">
              <Scissors size={18} className="text-plum" />
            </div>
            <span className="font-display text-lg text-ink">{settings.salonName}</span>
          </div>

          <h2 className="font-display text-3xl text-ink mb-1">Welcome back</h2>
          <p className="text-muted text-sm mb-8">Sign in to the front desk to start billing.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className="input pl-10"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoFocus
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button type="submit" className="btn-primary w-full py-3 mt-2">
              Sign in
            </button>
          </form>

          <p className="text-xs text-muted mt-8 text-center">
            Default demo login — username <span className="font-mono text-ink">admin</span>, password{' '}
            <span className="font-mono text-ink">salon123</span>
          </p>
        </div>
      </div>
    </div>
  )
}
