import React, { useRef, useState } from 'react'
import {
  CircleUserRound,
  ReceiptText,
  DatabaseBackup,
  KeyRound,
  Download,
  Upload,
  Check,
  Bell,
  Zap,
  TriangleAlert,
  RotateCcw,
  Globe,
  RefreshCw,
  MessageCircle,
  Send,
  Loader2,
  CircleCheck,
  CircleX,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, Modal } from '../components/ui.jsx'
import { sendInvoiceViaCloudApi, fetchSyncedTemplates, isCrmConnectionConfigured } from '../utils/whatsappCloudApi.js'
import { FOLLOWUP_TOKENS } from '../utils/helpers.js'

export default function Settings() {
  const {
    settings,
    updateSettings,
    exportBackup,
    restoreBackup,
    resetCatalogToDefaults,
    user,
    updateLogin,
    templates,
    publishServiceCatalog,
    publishStaffRoster,
    isSupabaseConfigured,
    services,
    staff,
  } = useApp()
  const [form, setForm] = useState(settings)
  const [savedFlash, setSavedFlash] = useState(false)
  const [credForm, setCredForm] = useState({ email: user?.email || '', password: '' })
  const [credSaved, setCredSaved] = useState(false)
  const [credError, setCredError] = useState('')
  const [credSaving, setCredSaving] = useState(false)
  const fileInputRef = useRef(null)
  const [restoreMessage, setRestoreMessage] = useState('')
  const [confirmResetCatalog, setConfirmResetCatalog] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState(null)
  const [publishingStaff, setPublishingStaff] = useState(false)
  const [publishStaffResult, setPublishStaffResult] = useState(null)
  const [ntfyCopied, setNtfyCopied] = useState(false)
  const [testPhone, setTestPhone] = useState('')
  const [testStatus, setTestStatus] = useState('idle') // idle | sending | sent | error
  const [testError, setTestError] = useState('')
  const [syncStatus, setSyncStatus] = useState('idle') // idle | syncing | synced | error
  const [syncError, setSyncError] = useState('')

  const NTFY_TOPIC = 'CutsBlushSalonAppointmentsNotification'

  async function handleSyncFollowUpTemplates() {
    setSyncStatus('syncing')
    setSyncError('')
    const result = await fetchSyncedTemplates(form)
    if (result.ok) {
      setForm((s) => ({ ...s, followUpSyncedTemplates: result.templates }))
      setSyncStatus('synced')
      setTimeout(() => setSyncStatus('idle'), 3000)
    } else {
      setSyncStatus('error')
      setSyncError(result.error)
    }
  }

  async function handleSendTestInvoice() {
    setTestStatus('sending')
    setTestError('')
    const testBill = {
      billNo: `${form.invoicePrefix || 'CB'}-TEST`,
      date: new Date().toISOString(),
      total: 850,
      client: { name: 'Test Client', phone: testPhone },
    }
    // Force-enable for the test call so you can verify the connection
    // before flipping the toggle on for real invoices.
    const result = await sendInvoiceViaCloudApi({ ...settings, ...form, invoiceApiEnabled: true }, testBill)
    if (result.ok) {
      setTestStatus('sent')
      setTimeout(() => setTestStatus('idle'), 4000)
    } else {
      setTestStatus('error')
      setTestError(result.error)
    }
  }

  function handleCopyNtfyTopic() {
    navigator.clipboard?.writeText(NTFY_TOPIC).then(() => {
      setNtfyCopied(true)
      setTimeout(() => setNtfyCopied(false), 2000)
    })
  }

  async function handlePublishCatalog() {
    setPublishing(true)
    setPublishResult(null)
    const result = await publishServiceCatalog()
    setPublishing(false)
    setPublishResult(result)
  }

  async function handlePublishStaff() {
    setPublishingStaff(true)
    setPublishStaffResult(null)
    const result = await publishStaffRoster()
    setPublishingStaff(false)
    setPublishStaffResult(result)
  }

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

        {/* Sending mode */}
        <div className="border-t border-black/5 pt-5">
          <p className="label mb-2">Sending mode</p>
          <div className="space-y-2.5 mb-4">
            <label className="flex items-start gap-2.5 text-sm text-ink">
              <input
                type="radio"
                name="followUpSendMode"
                checked={form.followUpSendMode !== 'api'}
                onChange={() => setForm((s) => ({ ...s, followUpSendMode: 'manual' }))}
                className="w-4 h-4 accent-plum mt-0.5"
              />
              <span>
                <span className="font-medium">Manual</span> — your own custom templates (manage wording on the{' '}
                <span className="font-medium">Follow-ups → Templates</span> tab). Tapping "Send" opens a pre-filled
                WhatsApp chat for you to send yourself.
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-sm text-ink">
              <input
                type="radio"
                name="followUpSendMode"
                checked={form.followUpSendMode === 'api'}
                onChange={() => setForm((s) => ({ ...s, followUpSendMode: 'api' }))}
                className="w-4 h-4 accent-plum mt-0.5"
              />
              <span className="flex items-center gap-1.5">
                <Zap size={14} className="text-brass-dark shrink-0" />
                <span>
                  <span className="font-medium">Automatic via WhatsApp CRM</span> — sends a template synced from your
                  WhatsApp CRM with no manual step, including a genuine one-click "send to all due" button. Only
                  approved templates synced below can be used — no custom wording in this mode.
                </span>
              </span>
            </label>
          </div>

          {form.followUpSendMode === 'api' && (
            <div className="rounded-lg bg-plum/5 p-3 space-y-3">
              {!isCrmConnectionConfigured(form) && (
                <p className="flex items-start gap-2 text-xs text-ink">
                  <TriangleAlert size={14} className="text-plum mt-0.5 shrink-0" />
                  Set the <span className="font-medium mx-1">WhatsApp CRM connection</span> below first, then come
                  back here to sync templates.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSyncFollowUpTemplates}
                  className="btn-ghost"
                  disabled={syncStatus === 'syncing' || !isCrmConnectionConfigured(form)}
                >
                  {syncStatus === 'syncing' ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                  {syncStatus === 'syncing' ? 'Syncing…' : 'Sync templates'}
                </button>
                <span className="text-xs text-muted">{(form.followUpSyncedTemplates || []).length} template(s) synced</span>
                {syncStatus === 'synced' && (
                  <span className="text-success text-xs font-medium flex items-center gap-1">
                    <CircleCheck size={13} /> Synced
                  </span>
                )}
              </div>
              {syncStatus === 'error' && (
                <p className="text-xs text-danger flex items-center gap-1">
                  <CircleX size={13} /> {syncError}
                </p>
              )}

              {(form.followUpSyncedTemplates || []).length === 0 ? (
                <p className="text-xs text-muted">
                  No templates synced yet. Approve a template in Meta, sync it into your WhatsApp CRM's dashboard,
                  then click "Sync templates" above to pull it in here.
                </p>
              ) : (
                <div className="space-y-3">
                  {form.followUpSyncedTemplates.map((t) => (
                    <SyncedTemplateCard
                      key={t.id}
                      template={t}
                      isDefault={form.followUpApiTemplateId === t.id}
                      mapping={form.followUpSyncedTemplateMappings?.[t.id]}
                      onSetDefault={() => setForm((s) => ({ ...s, followUpApiTemplateId: t.id }))}
                      onMappingChange={(mapping) =>
                        setForm((s) => ({
                          ...s,
                          followUpSyncedTemplateMappings: { ...s.followUpSyncedTemplateMappings, [t.id]: mapping },
                        }))
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* WhatsApp CRM connection */}
      <section className="card p-5 sm:p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle size={17} className="text-plum" />
          <p className="font-display text-lg text-ink">WhatsApp CRM connection</p>
        </div>
        <p className="text-sm text-muted mb-4">
          Shared by <span className="font-medium text-ink">Follow-ups automatic sending</span> above and{' '}
          <span className="font-medium text-ink">Invoice WhatsApp sending</span> below. This app runs in your
          browser, so it can't hold a Meta access token securely — it points at your WhatsApp CRM deployment
          instead, which already speaks the WhatsApp Cloud API on your behalf.
        </p>
        <div className="space-y-3">
          <div>
            <label className="label">Base URL</label>
            <input
              className="input"
              placeholder="https://your-whatsapp-crm.vercel.app"
              value={form.whatsappCrmBaseUrl}
              onChange={(e) => setForm((s) => ({ ...s, whatsappCrmBaseUrl: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">API key</label>
            <input
              className="input"
              type="password"
              placeholder="wacrm_live_..."
              value={form.whatsappCrmApiKey}
              onChange={(e) => setForm((s) => ({ ...s, whatsappCrmApiKey: e.target.value }))}
            />
            <p className="text-xs text-muted mt-1.5">
              Created under Account → API keys in your WhatsApp CRM. Grant{' '}
              <span className="font-mono">messages:send</span> (both features) and{' '}
              <span className="font-mono">templates:read</span> (needed for Follow-ups' "Sync templates").
            </p>
          </div>
        </div>
      </section>

      {/* Invoice WhatsApp sending */}
      <section className="card p-5 sm:p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle size={17} className="text-plum" />
          <p className="font-display text-lg text-ink">Invoice WhatsApp sending</p>
        </div>

        <label className="flex items-center gap-2.5 text-sm font-medium text-ink mb-3">
          <input
            type="checkbox"
            checked={form.invoiceApiEnabled}
            onChange={(e) => setForm((s) => ({ ...s, invoiceApiEnabled: e.target.checked }))}
            className="w-4 h-4 accent-plum"
          />
          <Zap size={15} className="text-brass-dark" /> Send invoices automatically via WhatsApp Cloud API
        </label>

        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-plum/5 text-xs text-ink mb-4">
          <TriangleAlert size={15} className="text-plum mt-0.5 shrink-0" />
          <p>
            Leave this off (default) and "Share on WhatsApp" keeps working the manual way — it opens a pre-filled
            WhatsApp chat for you to send yourself. Turn it on once the <span className="font-medium">WhatsApp CRM
            connection</span> above is set up, and the same button instead sends the approved invoice template
            straight away, with no chat window and no manual step.
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Template name</label>
              <input
                className="input"
                value={form.invoiceTemplateName}
                onChange={(e) => setForm((s) => ({ ...s, invoiceTemplateName: e.target.value }))}
                disabled={!form.invoiceApiEnabled}
              />
              <p className="text-xs text-muted mt-1.5">Must match the name of the approved template exactly (case-sensitive).</p>
            </div>
            <div>
              <label className="label">Template language code</label>
              <input
                className="input"
                placeholder="en"
                value={form.invoiceTemplateLanguage}
                onChange={(e) => setForm((s) => ({ ...s, invoiceTemplateLanguage: e.target.value }))}
                disabled={!form.invoiceApiEnabled}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-black/5 mt-5 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Approved template reference</p>
          <div className="rounded-lg bg-sand/50 px-3 py-3 text-xs text-ink font-mono whitespace-pre-wrap leading-relaxed">
{`Hello {{1}}, thanks for visiting *${form.salonName || 'Cuts & Blush Unisex Salon'}*.

Your invoice *{{2}}* for *{{3}}* is created.

*Total paid:* {{4}}

You can view detailed invoice using the button below.

Thanks,
Team ${form.salonName || 'Cuts & Blush Unisex Salon'}

Button — View Invoice → https://cutsblushsalon.vercel.app/invoice/{{1}}`}
          </div>
          <p className="text-xs text-muted mt-2">
            {'{{1}}'} name, {'{{2}}'} invoice number, {'{{3}}'} date, {'{{4}}'} total paid — all four (plus the
            button's invoice-number suffix) are generated automatically from the bill, never typed in.
          </p>
        </div>

        <div className="border-t border-black/5 mt-5 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Test the connection</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="input sm:w-56"
              placeholder="Your WhatsApp number"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
            <button
              onClick={handleSendTestInvoice}
              className="btn-ghost"
              disabled={testStatus === 'sending' || !testPhone.trim() || !form.whatsappCrmBaseUrl || !form.whatsappCrmApiKey || !form.invoiceTemplateName}
            >
              {testStatus === 'sending' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {testStatus === 'sending' ? 'Sending…' : 'Send test invoice'}
            </button>
            {testStatus === 'sent' && (
              <span className="text-success text-sm font-medium flex items-center gap-1">
                <CircleCheck size={15} /> Sent — check WhatsApp
              </span>
            )}
          </div>
          {testStatus === 'error' && (
            <p className="text-xs text-danger mt-2 flex items-center gap-1">
              <CircleX size={13} /> {testError}
            </p>
          )}
          <p className="text-xs text-muted mt-2">Sends a real template message with dummy invoice data, using the values above (saved or not).</p>
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

      {/* Booking website sync */}
      <section className="card p-5 sm:p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={17} className="text-plum" />
          <p className="font-display text-lg text-ink">Booking website sync</p>
        </div>
        <p className="text-sm text-muted mb-4">
          Your salon website reads its service list — and, for the "choose your staff" option, an active-staff
          roster (names &amp; roles only, never phone numbers or pay) — from Supabase, not from this browser
          directly. Both update automatically whenever you change services or staff — these buttons just let you
          force it right now, e.g. right after setting up Supabase, or to check the connection is working.
        </p>
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`w-2 h-2 rounded-full ${isSupabaseConfigured ? 'bg-success' : 'bg-danger'}`}
          />
          <span className="text-xs text-muted">
            {isSupabaseConfigured
              ? 'Supabase is configured for this app.'
              : "Supabase isn't configured — add VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to this app's .env and restart it before publishing."}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handlePublishCatalog} className="btn-ghost" disabled={publishing || !isSupabaseConfigured}>
            <RefreshCw size={15} className={publishing ? 'animate-spin' : ''} /> {publishing ? 'Publishing…' : 'Publish services now'}
          </button>
          <span className="text-xs text-muted">{services.length} services in your catalog</span>
        </div>
        {publishResult && (
          <p className={`text-xs mt-3 ${publishResult.ok ? 'text-success' : 'text-danger'}`}>
            {publishResult.ok
              ? 'Published. Refresh the booking page on your website to see it.'
              : `Failed to publish: ${publishResult.error}`}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-black/5">
          <button onClick={handlePublishStaff} className="btn-ghost" disabled={publishingStaff || !isSupabaseConfigured}>
            <RefreshCw size={15} className={publishingStaff ? 'animate-spin' : ''} /> {publishingStaff ? 'Publishing…' : 'Publish staff now'}
          </button>
          <span className="text-xs text-muted">{staff.filter((s) => s.active).length} active staff shown to clients</span>
        </div>
        {publishStaffResult && (
          <p className={`text-xs mt-3 ${publishStaffResult.ok ? 'text-success' : 'text-danger'}`}>
            {publishStaffResult.ok
              ? 'Published. Refresh the booking page on your website to see it.'
              : `Failed to publish: ${publishStaffResult.error}`}
          </p>
        )}
        <p className="text-xs text-muted mt-4">
          Still not showing on the website? Double check: (1) the site's own <code>.env</code> has the exact same
          Supabase URL/key as this app, (2) you've run <code>supabase/public_catalog.sql</code>,{' '}
          <code>supabase/appointments.sql</code> and <code>supabase/staff_availability.sql</code> in the Supabase SQL
          editor, and (3) the website was rebuilt/redeployed after that <code>.env</code> was added.
        </p>
      </section>

      {/* Push notifications */}
      <section className="card p-5 sm:p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={17} className="text-plum" />
          <p className="font-display text-lg text-ink">Push notifications (ntfy)</p>
        </div>
        <p className="text-sm text-muted mb-4">
          Every new appointment — booked on the website or added here — pushes an instant phone notification via{' '}
          <a href="https://ntfy.sh" target="_blank" rel="noreferrer" className="underline">
            ntfy
          </a>
          , even if this app isn't open. Install the free ntfy app (iOS/Android), then subscribe to this topic:
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-lg bg-sand/60 px-3 py-2 text-sm text-ink">{NTFY_TOPIC}</code>
          <button onClick={handleCopyNtfyTopic} className="btn-ghost">
            {ntfyCopied ? (
              <>
                <Check size={15} /> Copied
              </>
            ) : (
              'Copy topic'
            )}
          </button>
        </div>
        <p className="text-xs text-muted mt-4">
          This is a public ntfy.sh topic — treat the name itself as the "password": anyone who knows it can read
          these notifications, so don't post it publicly. For extra privacy, open{' '}
          <code>supabase/appointment_notifications.sql</code>, change <code>ntfy_topic</code> to something private,
          re-run it in the Supabase SQL editor, then subscribe to the new name instead.
        </p>
      </section>

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

// One synced WhatsApp CRM template's card: shows its (read-only,
// Meta-approved) body text, lets the admin map each {{n}} body
// variable and any URL button variable onto one of FOLLOWUP_TOKENS,
// and mark it the default template for automatic follow-up sending.
// Local to Settings.jsx - only used here.
function SyncedTemplateCard({ template, isDefault, mapping, onSetDefault, onMappingChange }) {
  const bodyMapping = mapping?.body || Array(template.body_variable_count).fill('')
  const buttonParamsMapping = mapping?.buttonParams || {}

  function updateBodyVar(index, value) {
    const next = [...bodyMapping]
    next[index] = value
    onMappingChange({ body: next, buttonParams: buttonParamsMapping })
  }

  function updateButtonVar(buttonIndex, value) {
    onMappingChange({ body: bodyMapping, buttonParams: { ...buttonParamsMapping, [buttonIndex]: value } })
  }

  const urlButtonsWithVars = (template.buttons || [])
    .map((b, i) => ({ ...b, index: i }))
    .filter((b) => b.type === 'URL' && b.variable_count > 0)

  return (
    <div className="rounded-lg border border-black/10 p-3 bg-paper">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="text-sm font-medium text-ink">{template.name}</p>
          <p className="text-xs text-muted">
            {template.language} · {template.category}
          </p>
        </div>
        <button
          onClick={onSetDefault}
          className={`text-xs px-2.5 py-1 rounded-full border shrink-0 ${
            isDefault ? 'bg-plum text-cream border-plum' : 'border-black/10 text-muted hover:bg-black/5'
          }`}
        >
          {isDefault ? 'Default' : 'Set default'}
        </button>
      </div>

      <p className="text-xs font-mono text-ink bg-sand/50 rounded-lg p-2 whitespace-pre-wrap mb-2.5 leading-relaxed">
        {template.body_text}
      </p>

      {(template.body_variable_count > 0 || urlButtonsWithVars.length > 0) && (
        <div className="space-y-1.5">
          {Array.from({ length: template.body_variable_count }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted w-12 shrink-0 font-mono">{`{{${i + 1}}}`}</span>
              <select className="input text-xs py-1.5" value={bodyMapping[i] || ''} onChange={(e) => updateBodyVar(i, e.target.value)}>
                <option value="">Choose a value…</option>
                {FOLLOWUP_TOKENS.map((tk) => (
                  <option key={tk.key} value={tk.key}>
                    {tk.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {urlButtonsWithVars.map((b) => (
            <div key={b.index} className="flex items-center gap-2">
              <span className="text-xs text-muted w-12 shrink-0" title={`Button: ${b.text}`}>
                Button
              </span>
              <select
                className="input text-xs py-1.5"
                value={buttonParamsMapping[b.index] || ''}
                onChange={(e) => updateButtonVar(b.index, e.target.value)}
              >
                <option value="">Choose a value…</option>
                {FOLLOWUP_TOKENS.map((tk) => (
                  <option key={tk.key} value={tk.key}>
                    {tk.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
