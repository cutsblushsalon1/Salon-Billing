import React, { useMemo, useState } from 'react'
import { Search, Plus, Pencil, Trash2, Scissors, Clock, Download, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, Modal, EmptyState, Badge } from '../components/ui.jsx'
import { formatCurrency, uid, capitalizeWords } from '../utils/helpers.js'
import { downloadCatalogExcel } from '../utils/excel.js'

const emptyForm = { name: '', category: '', gender: 'Unisex', price: '', duration: '', isCombo: false, comboServiceIds: [] }
const CATEGORY_TONES = { Hair: 'plum', Colour: 'brass', Treatment: 'success', Skin: 'muted', Nails: 'plum', Wellness: 'success', Makeup: 'brass' }

export default function Services() {
  const { services, products, settings, upsertService, deleteService } = useApp()
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [comboSearch, setComboSearch] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return services.filter((s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
  }, [services, query])

  function handleExport() {
    downloadCatalogExcel({ services, products, currencySymbol: settings.currencySymbol, label: 'services-and-products' })
  }

  function openAdd() {
    setForm(emptyForm)
    setEditingId(null)
    setComboSearch('')
    setModalOpen(true)
  }

  function openEdit(s) {
    setForm({
      name: s.name,
      category: s.category,
      gender: s.gender,
      price: s.price,
      duration: s.duration,
      isCombo: !!s.isCombo,
      comboServiceIds: s.comboServiceIds || [],
    })
    setEditingId(s.id)
    setComboSearch('')
    setModalOpen(true)
  }

  function toggleComboService(id) {
    setForm((s) => {
      const has = s.comboServiceIds.includes(id)
      return { ...s, comboServiceIds: has ? s.comboServiceIds.filter((x) => x !== id) : [...s.comboServiceIds, id] }
    })
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
      isCombo: form.isCombo,
      comboServiceIds: form.isCombo ? form.comboServiceIds : [],
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
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={handleExport}>
              <Download size={15} /> Export .xlsx
            </button>
            <button className="btn-primary" onClick={openAdd}>
              <Plus size={16} /> Add Service
            </button>
          </div>
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
                    <td className="px-5 py-3.5 font-medium text-ink">
                      <span className="flex items-center gap-1.5">
                        {s.name}
                        {s.isCombo && (
                          <Badge tone="brass">
                            Combo Offer
                          </Badge>
                        )}
                      </span>
                    </td>
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
          <div className="border-t border-black/5 pt-3">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.isCombo}
                onChange={(e) => setForm((s) => ({ ...s, isCombo: e.target.checked }))}
                className="w-4 h-4 accent-plum"
              />
              This is a combo offer (bundles other services at one price)
            </label>
            {form.isCombo && (
              <div className="mt-3">
                <label className="label">Included services</label>
                <div className="relative mb-2">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    className="input pl-9"
                    placeholder="Search services…"
                    value={comboSearch}
                    onChange={(e) => setComboSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-black/10 p-2 space-y-1">
                  {services
                    .filter((s) => s.id !== editingId && !s.isCombo)
                    .filter((s) => {
                      const q = comboSearch.trim().toLowerCase()
                      return !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
                    })
                    .map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm text-ink px-1.5 py-1 rounded hover:bg-black/[0.03] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.comboServiceIds.includes(s.id)}
                          onChange={() => toggleComboService(s.id)}
                          className="w-4 h-4 accent-plum"
                        />
                        {s.name}
                        <span className="text-muted text-xs ml-auto">{formatCurrency(s.price, settings.currencySymbol)}</span>
                      </label>
                    ))}
                  {services.filter((s) => s.id !== editingId && !s.isCombo).length === 0 && (
                    <p className="text-xs text-muted px-1.5 py-1">Add some individual services first.</p>
                  )}
                  {services
                    .filter((s) => s.id !== editingId && !s.isCombo)
                    .filter((s) => {
                      const q = comboSearch.trim().toLowerCase()
                      return !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
                    }).length === 0 && services.filter((s) => s.id !== editingId && !s.isCombo).length > 0 && (
                    <p className="text-xs text-muted px-1.5 py-1">No matching services found.</p>
                  )}
                </div>
                <p className="text-xs text-muted mt-1.5">
                  Set the combo's own bundle price above — it's billed as one line item, showing the included
                  services underneath on the invoice.
                </p>
              </div>
            )}
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
