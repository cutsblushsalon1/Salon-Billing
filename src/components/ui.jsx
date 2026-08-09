import React from 'react'
import { X } from 'lucide-react'

export function StatCard({ label, value, icon: Icon, trend, accent = 'plum' }) {
  const accentMap = {
    plum: 'bg-plum/10 text-plum',
    brass: 'bg-brass/15 text-brass-dark',
    success: 'bg-success/10 text-success',
    danger: 'bg-danger/10 text-danger',
  }
  return (
    <div className="card p-5 flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{label}</p>
        <p className="font-display text-2xl sm:text-3xl text-ink tabular">{value}</p>
        {trend && <p className="text-xs text-muted mt-1.5">{trend}</p>}
      </div>
      {Icon && (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accentMap[accent]}`}>
          <Icon size={18} />
        </div>
      )}
    </div>
  )
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        {eyebrow && <p className="font-mono text-xs uppercase tracking-[0.2em] text-brass-dark mb-1.5">{eyebrow}</p>}
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="card flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-plum/10 text-plum flex items-center justify-center mb-4">
          <Icon size={22} />
        </div>
      )}
      <p className="font-display text-lg text-ink mb-1">{title}</p>
      {subtitle && <p className="text-muted text-sm max-w-sm mb-5">{subtitle}</p>}
      {action}
    </div>
  )
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  const sizeMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-paper rounded-xl2 shadow-card w-full ${sizeMap[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 shrink-0">
          <h3 className="font-display text-lg text-ink">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink p-1">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export function Badge({ children, tone = 'muted' }) {
  const toneMap = {
    muted: 'bg-black/5 text-muted',
    success: 'bg-success/10 text-success',
    danger: 'bg-danger/10 text-danger',
    brass: 'bg-brass/15 text-brass-dark',
    plum: 'bg-plum/10 text-plum',
  }
  return <span className={`badge ${toneMap[tone]}`}>{children}</span>
}
