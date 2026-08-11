import React, { useRef, useState } from 'react'
import { CircleUserRound, ReceiptText, DatabaseBackup, KeyRound, Download, Upload, Check, Bell, Zap, TriangleAlert } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader } from '../components/ui.jsx'

export default function Settings() {
  const { settings, updateSettings, exportBackup, restoreBackup, auth, changeCredentials, templates } = useApp()
  const [form, setForm] = useState(settings)
  const [savedFlash, setSavedFlash] = useState(false)
  const [credForm, setCredForm] = useState({ username: auth.username, password: '' })
  const [credSaved, setCredSaved] = useState(false)
  const fileInputRef = useRef(null)
  const [restoreMessage, setRestoreMessage] = useState('')

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
        setRestoreMessage('Could not read that file — make sure it\u2019s a valid backup JSON.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleCredSave() {
    changeCredentials(credForm.username.trim() || auth.username, credForm.password || auth.password)
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

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-danger/5 text-xs text-ink mb-4">
            <TriangleAlert size={15} className="text-danger mt-0.5 shrink-0" />
            <p>
              This app runs entirely in your browser with no server, so it can't send messages on a schedule by itself or store an
              API key securely. The fields below just save your intended setup — to actually send automatically you'll need a small
              backend (e.g. a scheduled cloud function) connected to a WhatsApp Business API provider, which reads these settings and
              triggers the sends. Until that's connected, use the manual send queue on the Follow-ups page.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">API provider</label>
              <select
                className="input"
                value={form.followUpApiProvider}
                onChange={(e) => setForm((s) => ({ ...s, followUpApiProvider: e.target.value }))}
                disabled={!form.followUpAutoEnabled}
              >
                <option value="">Not connected</option>
                <option value="whatsapp_cloud">WhatsApp Cloud API (Meta)</option>
                <option value="twilio">Twilio</option>
                <option value="aisensy">AiSensy</option>
                <option value="gupshup">Gupshup</option>
                <option value="other">Other / custom webhook</option>
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
          <div className="mt-3">
            <label className="label">API key / token</label>
            <input
              className="input"
              type="password"
              placeholder="Stored locally in this browser only"
              value={form.followUpApiKey}
              onChange={(e) => setForm((s) => ({ ...s, followUpApiKey: e.target.value }))}
              disabled={!form.followUpAutoEnabled}
            />
          </div>
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
              <label className="label">Username</label>
              <input className="input" value={credForm.username} onChange={(e) => setCredForm((s) => ({ ...s, username: e.target.value }))} />
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
            <div className="flex items-center gap-3">
              <button onClick={handleCredSave} className="btn-primary">
                Update login
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
    </div>
  )
}
