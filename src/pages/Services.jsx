import React, { useMemo, useState } from 'react'
import { Search, Plus, Pencil, Trash2, Scissors, Clock } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, Modal, EmptyState, Badge } from '../components/ui.jsx'
import { formatCurrency, uid } from '../utils/helpers.js'

const emptyForm = { name: '', category: '', gender: 'Unisex', price: '', duration: '' }
const CATEGORY_TONES = { Hair: 'plum', Colour: 'brass', Treatment: 'success', Skin: 'muted', Nails: 'plum', Wellness: 'success', Makeup: 'brass' }

export default function Services() {
  const { services, settings, upsertService, deleteService } = useApp()
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return services.filter((s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
  }, [services, query])

  function openAdd() {
    setForm(emptyForm)
    setEditingId(null)
    setModalOpen(true)
  }

  function openEdit(s) {
    setForm({ name: s.name, category: s.category, gender: s.gender, price: s.price, duration: s.duration })
    setEditingId(s.id)
    setModalOpen(true)
  }

  function handleSave() {
    if (!form.name.trim() || !form.price) return
    upsertService({
      id: editingId || uid('svc'),
      name: form.name,
      category: form.category || 'General',
      gender: form.gender,
      price: Number(form.price),
      duration: Number(form.duration) || 0,
    })
    setModalOpen(false)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Menu"
        title="Services"
        subtitle={`${services.length} service${services.length === 1 ? '' : 's'} in your menu`}
        actions={
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={16} /> Add Service
          </button>
        }
      />

      <div className="relative mb-6 max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input pl-10" placeholder="Search services or category…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Scissors} title="No services found" subtitle="Add services to build your billing menu." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/[0.02] text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Service</th>
                  <th className="text-left px-5 py-3 font-semibold">Category</th>
                  <th className="text-left px-5 py-3 font-semibold">For</th>
                  <th className="text-left px-5 py-3 font-semibold">Duration</th>
                  <th className="text-right px-5 py-3 font-semibold">Price</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-black/[0.015]">
                    <td className="px-5 py-3.5 font-medium text-ink">{s.name}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={CATEGORY_TONES[s.category] || 'muted'}>{s.category}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-muted">{s.gender}</td>
                    <td className="px-5 py-3.5 text-muted">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {s.duration} min
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular text-ink">
                      {formatCurrency(s.price, settings.currencySymbol)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(s)} className="p-1.5 text-muted hover:text-plum">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => setConfirmDelete(s)} className="p-1.5 text-muted hover:text-danger">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit service' : 'Add service'}>
        <div className="space-y-3">
          <div>
            <label className="label">Service name</label>
            <input className="input" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <input
                className="input"
                placeholder="Hair, Skin, Nails…"
                value={form.category}
                onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">For</label>
              <select className="input" value={form.gender} onChange={(e) => setForm((s) => ({ ...s, gender: e.target.value }))}>
                <option>Unisex</option>
                <option>Female</option>
                <option>Male</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Price ({settings.currencySymbol})</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.price}
                onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Duration (min)</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.duration}
                onChange={(e) => setForm((s) => ({ ...s, duration: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary" disabled={!form.name.trim() || !form.price}>
              Save service
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remove service?" size="sm">
        {confirmDelete && (
          <div>
            <p className="text-sm text-muted mb-5">
              Remove <span className="font-semibold text-ink">{confirmDelete.name}</span> from your service menu?
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost">
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteService(confirmDelete.id)
                  setConfirmDelete(null)
                }}
                className="btn-danger"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
