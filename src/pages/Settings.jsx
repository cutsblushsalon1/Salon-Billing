import React, { useRef, useState } from 'react'
import { CircleUserRound, ReceiptText, DatabaseBackup, KeyRound, Download, Upload, Check, Bell, Zap, TriangleAlert, RotateCcw } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, Modal } from '../components/ui.jsx'

export default function Settings() {
  const { settings, updateSettings, exportBackup, restoreBackup, resetCatalogToDefaults, user, updateLogin, templates } = useApp()
  const [form, setForm] = useState(settings)
  const [savedFlash, setSavedFlash] = useState(false)
  const [credForm, setCredForm] = useState({ email: user?.email || '', password: '' })
  const [credSaved, setCredSaved] = useState(false)
  const [credError, setCredError] = useState('')
  const [credSaving, setCredSaving] = useState(false)
  const fileInputRef = useRef(null)
  const [restoreMessage, setRestoreMessage] = useState('')
  const [confirmResetCatalog, setConfirmResetCatalog] = useState(false)

  function handleSaveProfile() {
    updateSettings(form)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  function handleExport() {
    const data = exportBackup()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `salon-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleRestoreFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        restoreBackup(data)
        setForm(data.settings || form)
        setRestoreMessage('Backup restored successfully.')
      } catch {
        setRestoreMessage("Could not read that file — make sure it's a valid backup JSON.")
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleCredSave() {
    setCredError('')
    setCredSaving(true)
    const patch = {}
    if (credForm.email.trim() && credForm.email.trim() !== user?.email) patch.email = credForm.email.trim()
    if (credForm.password) patch.password = credForm.password
    const { ok, error } = await updateLogin(patch)
    setCredSaving(false)
    if (!ok) {
      setCredError(error || 'Could not update login.')
      return
    }
    setCredSaved(true)
    setCredForm((s) => ({ ...s, password: '' }))
    setTimeout(() => setCredSaved(false), 2000)
  }

  return (
    <div>
      <PageHeader eyebrow="Configuration" title="Settings" subtitle="Salon profile, invoicing rules, backups, and login." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salon Profile */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <CircleUserRound size={17} className="text-plum" />
            <p className="font-display text-lg text-ink">Salon profile</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="label">Salon name</label>
              <input className="input" value={form.salonName} onChange={(e) => setForm((s) => ({ ...s, salonName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Tagline</label>
              <input className="input" value={form.tagline} onChange={(e) => setForm((s) => ({ ...s, tagline: e.target.value }))} />
            </div>
            <div>
              <label className="label">Address</label>
              <textarea className="input" rows={2} value={form.address} onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">GST number (optional)</label>
              <input className="input" value={form.gstNumber} onChange={(e) => setForm((s) => ({ ...s, gstNumber: e.target.value }))} />
            </div>
          </div>
        </section>

        {/* Invoice Settings */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <ReceiptText size={17} className="text-plum" />
            <p className="font-display text-lg text-ink">Invoice settings</p>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Invoice prefix</label>
                <input className="input" value={form.invoicePrefix} onChange={(e) => setForm((s) => ({ ...s, invoicePrefix: e.target.value }))} />
              </div>
              <div>
                <label className="label">Next invoice no.</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={form.invoiceCounter}
                  onChange={(e) => setForm((s) => ({ ...s, invoiceCounter: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Default tax %</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={form.defaultTaxPercent}
                  onChange={(e) => setForm((s) => ({ ...s, defaultTaxPercent: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="label">Currency symbol</label>
                <input className="input" value={form.currencySymbol} onChange={(e) => setForm((s) => ({ ...s, currencySymbol: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">UPI ID (optional)</label>
              <input className="input" value={form.upiId} onChange={(e) => setForm((s) => ({ ...s, upiId: e.target.value }))} />
            </div>
            <div>
              <label className="label">Google review link</label>
              <input
                className="input"
                placeholder="https://maps.app.goo.gl/..."
                value={form.googleReviewLink || ''}
                onChange={(e) => setForm((s) => ({ ...s, googleReviewLink: e.target.value }))}
              />
              <p className="text-xs text-muted mt-1">Included as a "Leave us a review" link in the WhatsApp invoice message.</p>
            </div>
            <div>
              <label className="label">Invoice footer note</label>
              <textarea className="input" rows={2} value={form.invoiceFooter} onChange={(e) => setForm((s) => ({ ...s, invoiceFooter: e.target.value }))} />
            </div>
          </div>
        </section>
      </div>

      {/* Follow-up reminders */}
      <section className="card p-5 sm:p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={17} className="text-plum" />
          <p className="font-display text-lg text-ink">Follow-up reminders</p>
        </div>

        <label className="flex items-center gap-2.5 text-sm text-ink mb-4">
          <input
            type="checkbox"
            checked={form.followUpEnabled}
            onChange={(e) => setForm((s) => ({ ...s, followUpEnabled: e.target.checked }))}
            className="w-4 h-4 accent-plum"
          />
          Flag clients for a follow-up after a period of inactivity
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
          <div>
            <label className="label">Days after last visit</label>
            <input
              className="input"
              type="number"
              min="1"
              value={form.followUpDays}
              onChange={(e) => setForm((s) => ({ ...s, followUpDays: Number(e.target.value) }))}
              disabled={!form.followUpEnabled}
            />
          </div>
          <div>
            <label className="label">Default message template</label>
            <select
              className="input"
              value={form.followUpDefaultTemplateId}
              onChange={(e) => setForm((s) => ({ ...s, followUpDefaultTemplateId: e.target.value }))}
              disabled={!form.followUpEnabled}
            >
              {templates.length === 0 && <option value="">No templates yet</option>}
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-muted mb-5">
          Manage the message wording itself, and send follow-ups (one at a time or in a batch queue), from the{' '}
          <span className="font-medium text-ink">Follow-ups</span> page in the sidebar.
        </p>

        {/* Automatic sending */}
        <div className="border-t border-black/5 pt-5">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2.5 text-sm font-medium text-ink">
              <input
                type="checkbox"
                checked={form.followUpAutoEnabled}
                onChange={(e) => setForm((s) => ({ ...s, followUpAutoEnabled: e.target.checked }))}
                className="w-4 h-4 accent-plum"
              />
              <Zap size={15} className="text-brass-dark" /> Automatic sending via API
            </label>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-plum/5 text-xs text-ink mb-4">
            <TriangleAlert size={15} className="text-plum mt-0.5 shrink-0" />
            <p>
              This app runs in your browser, so it can't hold API credentials securely or run on its own schedule — that part needs a
              small backend you control. Once you have one (see the guide on the Follow-ups page), point{' '}
              <span className="font-medium">Webhook URL</span> at it below and turn this on. From then on, Follow-ups sends messages
              by calling that URL instead of opening WhatsApp manually — including a genuine one-click "send to all due" button.
              Leave this off (default) to keep using the manual WhatsApp send queue.
            </p>
          </div>

          <div>
            <label className="label">Webhook / API endpoint URL</label>
            <input
              className="input"
              placeholder="https://your-backend.example.com/api/send-followup"
              value={form.followUpWebhookUrl}
              onChange={(e) => setForm((s) => ({ ...s, followUpWebhookUrl: e.target.value }))}
              disabled={!form.followUpAutoEnabled}
            />
            <p className="text-xs text-muted mt-1.5">
              For each message, this app sends a POST request here with <span className="font-mono">{'{ phone, name, message }'}</span>{' '}
              as JSON. Your backend receives it and calls the WhatsApp API. It must accept cross-origin requests from this site.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="label">API provider (reference only)</label>
              <select
                className="input"
                value={form.followUpApiProvider}
                onChange={(e) => setForm((s) => ({ ...s, followUpApiProvider: e.target.value }))}
                disabled={!form.followUpAutoEnabled}
              >
                <option value="">Not set</option>
                <option value="whatsapp_cloud">WhatsApp Cloud API (Meta)</option>
                <option value="twilio">Twilio</option>
                <option value="aisensy">AiSensy</option>
                <option value="gupshup">Gupshup</option>
                <option value="other">Other / custom</option>
              </select>
            </div>
            <div>
              <label className="label">Sender number</label>
              <input
                className="input"
                placeholder="+91…"
                value={form.followUpSenderNumber}
                onChange={(e) => setForm((s) => ({ ...s, followUpSenderNumber: e.target.value }))}
                disabled={!form.followUpAutoEnabled}
              />
            </div>
          </div>
          <p className="text-xs text-muted mt-2">
            Provider and sender number are just labels for your own reference — the actual API key lives on your backend, never in
            this browser.
          </p>
        </div>
      </section>

      <div className="flex items-center gap-3 mt-4 mb-6">
        <button onClick={handleSaveProfile} className="btn-primary">
          Save changes
        </button>
        {savedFlash && (
          <span className="text-success text-sm font-medium flex items-center gap-1">
            <Check size={15} /> Saved
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backup / Restore */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <DatabaseBackup size={17} className="text-plum" />
            <p className="font-display text-lg text-ink">Backup &amp; restore</p>
          </div>
          <p className="text-sm text-muted mb-4">
            Export all clients, bills, services, products and settings as a JSON file, or restore from a previous backup.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleExport} className="btn-ghost">
              <Download size={15} /> Export backup
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="btn-ghost">
              <Upload size={15} /> Restore from file
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleRestoreFile} />
          </div>
          {restoreMessage && <p className="text-xs text-muted mt-3">{restoreMessage}</p>}
        </section>

        {/* Login credentials */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound size={17} className="text-plum" />
            <p className="font-display text-lg text-ink">Login credentials</p>
          </div>
          <div className="space-y-3">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={credForm.email}
                onChange={(e) => setCredForm((s) => ({ ...s, email: e.target.value }))}
              />
              <p className="text-xs text-muted mt-1">Changing this may require confirming via a link sent to the new address.</p>
            </div>
            <div>
              <label className="label">New password</label>
              <input
                className="input"
                type="password"
                placeholder="Leave blank to keep current password"
                value={credForm.password}
                onChange={(e) => setCredForm((s) => ({ ...s, password: e.target.value }))}
              />
            </div>
            {credError && <p className="text-sm text-danger">{credError}</p>}
            <div className="flex items-center gap-3">
              <button onClick={handleCredSave} className="btn-primary" disabled={credSaving}>
                {credSaving ? 'Updating…' : 'Update login'}
              </button>
              {credSaved && (
                <span className="text-success text-sm font-medium flex items-center gap-1">
                  <Check size={15} /> Updated
                </span>
              )}
            </div>
          </div>
        </section>
      </div>

      <Modal open={confirmResetCatalog} onClose={() => setConfirmResetCatalog(false)} title="Reset services & products?" size="sm">
        <div>
          <p className="text-sm text-muted mb-5">
            This replaces your current services and products list with the app's built-in sample catalog. Your clients, bills, staff,
            and settings are not affected. This can't be undone.
          </p>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setConfirmResetCatalog(false)} className="btn-ghost">
              Cancel
            </button>
            <button
              onClick={() => {
                resetCatalogToDefaults()
                setConfirmResetCatalog(false)
              }}
              className="btn-danger"
            >
              Reset catalog
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
