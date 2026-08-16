import React, { useMemo, useState } from 'react'
import { Search, Plus, Pencil, Trash2, Package, PackagePlus, PackageMinus, AlertTriangle, Download } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, Modal, EmptyState, Badge } from '../components/ui.jsx'
import { formatCurrency, uid } from '../utils/helpers.js'
import { downloadCatalogExcel } from '../utils/excel.js'

const emptyForm = { name: '', category: '', price: '', stock: '', lowStockAt: '5' }

export default function Products() {
  const { services, products, settings, upsertProduct, deleteProduct, adjustStock } = useApp()
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
  }, [products, query])

  const lowStock = products.filter((p) => p.stock <= (p.lowStockAt ?? 5))

  function handleExport() {
    downloadCatalogExcel({ services, products, currencySymbol: settings.currencySymbol, label: 'services-and-products' })
  }

  function openAdd() {
    setForm(emptyForm)
    setEditingId(null)
    setModalOpen(true)
  }

  function openEdit(p) {
    setForm({ name: p.name, category: p.category, price: p.price, stock: p.stock, lowStockAt: p.lowStockAt ?? 5 })
    setEditingId(p.id)
    setModalOpen(true)
  }

  function handleSave() {
    if (!form.name.trim() || !form.price) return
    upsertProduct({
      id: editingId || uid('prd'),
      name: form.name,
      category: form.category || 'General',
      price: Number(form.price),
      stock: Number(form.stock) || 0,
      lowStockAt: Number(form.lowStockAt) || 5,
    })
    setModalOpen(false)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Retail"
        title="Products"
        subtitle={`${products.length} product${products.length === 1 ? '' : 's'} tracked`}
        actions={
          <div className="flex items-center gap-2">
            <button className="btn-ghost" onClick={handleExport}>
              <Download size={15} /> Export .xlsx
            </button>
            <button className="btn-primary" onClick={openAdd}>
              <Plus size={16} /> Add Product
            </button>
          </div>
        }
      />

      {lowStock.length > 0 && (
        <div className="card p-4 mb-6 border-danger/20 bg-danger/5 flex items-center gap-3">
          <AlertTriangle size={18} className="text-danger shrink-0" />
          <p className="text-sm text-danger">
            <span className="font-semibold">{lowStock.length}</span> product{lowStock.length > 1 ? 's are' : ' is'} running low on stock:{' '}
            {lowStock.map((p) => p.name).join(', ')}
          </p>
        </div>
      )}

      <div className="relative mb-6 max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input pl-10" placeholder="Search products or category…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="No products found" subtitle="Add retail products to sell and track stock." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-black/[0.02] text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Product</th>
                  <th className="text-left px-5 py-3 font-semibold">Category</th>
                  <th className="text-right px-5 py-3 font-semibold">Price</th>
                  <th className="text-center px-5 py-3 font-semibold">Stock</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {filtered.map((p) => {
                  const low = p.stock <= (p.lowStockAt ?? 5)
                  return (
                    <tr key={p.id} className="hover:bg-black/[0.015]">
                      <td className="px-5 py-3.5 font-medium text-ink">{p.name}</td>
                      <td className="px-5 py-3.5 text-muted">{p.category}</td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular text-ink">
                        {formatCurrency(p.price, settings.currencySymbol)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => adjustStock(p.id, -1)} className="p-1 text-muted hover:text-danger">
                            <PackageMinus size={15} />
                          </button>
                          <span className={`tabular font-semibold w-6 text-center ${low ? 'text-danger' : 'text-ink'}`}>{p.stock}</span>
                          <button onClick={() => adjustStock(p.id, 1)} className="p-1 text-muted hover:text-success">
                            <PackagePlus size={15} />
                          </button>
                          {low && <Badge tone="danger">Low</Badge>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(p)} className="p-1.5 text-muted hover:text-plum">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => setConfirmDelete(p)} className="p-1.5 text-muted hover:text-danger">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit product' : 'Add product'}>
        <div className="space-y-3">
          <div>
            <label className="label">Product name</label>
            <input className="input" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="label">Category</label>
            <input
              className="input"
              placeholder="Haircare, Skincare…"
              value={form.category}
              onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Price ({settings.currencySymbol})</label>
              <input className="input" type="number" min="0" value={form.price} onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))} />
            </div>
            <div>
              <label className="label">Stock</label>
              <input className="input" type="number" min="0" value={form.stock} onChange={(e) => setForm((s) => ({ ...s, stock: e.target.value }))} />
            </div>
            <div>
              <label className="label">Low at</label>
              <input
                className="input"
                type="number"
                min="0"
                value={form.lowStockAt}
                onChange={(e) => setForm((s) => ({ ...s, lowStockAt: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary" disabled={!form.name.trim() || !form.price}>
              Save product
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remove product?" size="sm">
        {confirmDelete && (
          <div>
            <p className="text-sm text-muted mb-5">
              Remove <span className="font-semibold text-ink">{confirmDelete.name}</span> from your product catalogue?
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost">
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteProduct(confirmDelete.id)
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
