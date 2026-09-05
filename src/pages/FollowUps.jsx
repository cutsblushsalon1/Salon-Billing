import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  MessageSquareText,
  Search,
  Send,
  CheckCheck,
  Phone,
  Plus,
  Pencil,
  Trash2,
  Star,
  Info,
  SkipForward,
  Zap,
  Loader2,
  Crown,
  Settings as SettingsIcon,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, Modal, EmptyState, Badge } from '../components/ui.jsx'
import {
  formatDate,
  daysSince,
  buildFollowUpMessage,
  previewFollowUpApiTemplate,
  whatsappLink,
  findActiveMembership,
  getMembershipStatus,
  uid,
} from '../utils/helpers.js'
import { sendFollowUpViaCloudApi, isFollowUpApiConfigured } from '../utils/whatsappCloudApi.js'

const TABS = [
  { id: 'due', label: 'Due for follow-up', icon: Bell },
  { id: 'templates', label: 'Templates', icon: MessageSquareText },
]

const TOKEN_HELP = [
  ['{clientName}', "Client's name"],
  ['{salonName}', 'Your salon name'],
  ['{lastVisitDate}', 'Date of their last visit'],
  ['{daysSinceVisit}', 'Days since their last visit'],
  ['{lastService}', 'The last service they had'],
]

export default function FollowUps() {
  const { clients, templates, followUps, settings, clientMemberships } = useApp()
  const [tab, setTab] = useState('due')

  const dueClients = useMemo(() => {
    if (!settings.followUpEnabled) return []
    return clients
      .filter((c) => c.lastVisit && c.phone)
      .filter((c) => daysSince(c.lastVisit) >= (Number(settings.followUpDays) || 25))
      .filter((c) => {
        const lastContact = followUps
          .filter((f) => f.clientId === c.id)
          .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))[0]
        // Not contacted yet, or last contact was before their most recent visit
        // (i.e. we haven't followed up on this particular quiet streak yet).
        return !lastContact || new Date(lastContact.sentAt) <= new Date(c.lastVisit)
      })
      .map((c) => {
        const membership = findActiveMembership(c.id, clientMemberships)
        const isMember = !!membership && getMembershipStatus(membership.expiryDate).label !== 'Expired'
        return { ...c, isMember }
      })
      .sort((a, b) => daysSince(b.lastVisit) - daysSince(a.lastVisit))
  }, [clients, followUps, clientMemberships, settings.followUpEnabled, settings.followUpDays])

  return (
    <div>
      <PageHeader
        eyebrow="Retention"
        title="Follow-ups"
        subtitle="Reach out to clients who haven't been in for a while, manually with your own templates or automatically via your WhatsApp CRM."
      />

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-colors ${
              tab === id ? 'bg-plum text-cream' : 'bg-black/5 text-muted hover:bg-black/10'
            }`}
          >
            <Icon size={14} /> {label}
            {id === 'due' && dueClients.length > 0 && (
              <span className="ml-0.5 w-5 h-5 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
                {dueClients.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'due' && <DueTab dueClients={dueClients} />}
      {tab === 'templates' && <TemplatesTab />}
    </div>
  )
}

function DueTab({ dueClients }) {
  const { settings, templates, logFollowUp } = useApp()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const isApiMode = settings.followUpSendMode === 'api'
  const apiConfigured = isFollowUpApiConfigured(settings)

  const manualTemplate = templates.find((t) => t.id === settings.followUpDefaultTemplateId) || templates[0]
  const [manualTemplateId, setManualTemplateId] = useState(manualTemplate?.id || '')
  const selectedManualTemplate = templates.find((t) => t.id === manualTemplateId) || manualTemplate

  const [selected, setSelected] = useState(new Set())
  const [queueOpen, setQueueOpen] = useState(false)
  const [sendingId, setSendingId] = useState(null)
  const [bulkState, setBulkState] = useState(null) // { total, done, failed }
  const [membersOnly, setMembersOnly] = useState(false)

  const memberDueCount = useMemo(() => dueClients.filter((c) => c.isMember).length, [dueClients])

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return dueClients
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q))
      .filter((c) => !membersOnly || c.isMember)
  }, [dueClients, query, membersOnly])

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id))))
  }

  function previewFor(client) {
    if (isApiMode) return previewFollowUpApiTemplate(client, settings)
    return selectedManualTemplate ? buildFollowUpMessage(selectedManualTemplate, client, settings) : ''
  }

  async function sendOneApi(client) {
    setSendingId(client.id)
    const result = await sendFollowUpViaCloudApi(settings, client)
    if (result.ok) {
      logFollowUp({
        clientId: client.id,
        templateId: 'api',
        templateName: settings.followUpTemplateName,
        message: previewFor(client),
        method: 'api',
      })
    } else {
      alert(`Couldn't send to ${client.name}: ${result.error}`)
    }
    setSendingId(null)
  }

  function sendOneManual(client) {
    const message = buildFollowUpMessage(selectedManualTemplate, client, settings)
    window.open(whatsappLink(client.phone, message), '_blank', 'noopener,noreferrer')
    logFollowUp({ clientId: client.id, templateId: selectedManualTemplate.id, templateName: selectedManualTemplate.name, message, method: 'whatsapp' })
  }

  function sendOne(client) {
    if (isApiMode) {
      if (!apiConfigured) return
      sendOneApi(client)
    } else {
      if (!selectedManualTemplate) return
      sendOneManual(client)
    }
  }

  function markContacted(client) {
    const message = previewFor(client)
    if (isApiMode) {
      if (!apiConfigured) return
      logFollowUp({ clientId: client.id, templateId: 'api', templateName: settings.followUpTemplateName, message, method: 'manual' })
      return
    }
    if (!selectedManualTemplate) return
    logFollowUp({
      clientId: client.id,
      templateId: selectedManualTemplate.id,
      templateName: selectedManualTemplate.name,
      message,
      method: 'manual',
    })
  }

  // Genuine one-click batch send - only available in API mode, since
  // manual mode has to open one WhatsApp chat per client (see
  // SendQueueModal below).
  async function sendBulkApi(targets) {
    if (!apiConfigured || targets.length === 0) return
    setBulkState({ total: targets.length, done: 0, failed: 0 })
    for (const client of targets) {
      const result = await sendFollowUpViaCloudApi(settings, client)
      if (result.ok) {
        logFollowUp({
          clientId: client.id,
          templateId: 'api',
          templateName: settings.followUpTemplateName,
          message: previewFor(client),
          method: 'api',
        })
        setBulkState((s) => ({ ...s, done: s.done + 1 }))
      } else {
        setBulkState((s) => ({ ...s, done: s.done + 1, failed: s.failed + 1 }))
      }
      // Small gap between calls so the CRM isn't hammered.
      await new Promise((r) => setTimeout(r, 250))
    }
    setSelected(new Set())
  }

  function handleSendSelected() {
    const targets = filtered.filter((c) => selected.has(c.id))
    if (isApiMode) {
      sendBulkApi(targets)
    } else {
      setQueueOpen(true)
    }
  }

  if (!settings.followUpEnabled) {
    return (
      <EmptyState
        icon={Bell}
        title="Follow-up reminders are turned off"
        subtitle="Enable them in Settings and set how many days after a client's last visit they should be flagged for a follow-up."
        action={
          <button className="btn-primary" onClick={() => navigate('/settings')}>
            Go to Settings
          </button>
        }
      />
    )
  }

  if (isApiMode && !apiConfigured) {
    return (
      <EmptyState
        icon={SettingsIcon}
        title="Automatic sending isn't fully set up"
        subtitle="Automatic sending is on, but the WhatsApp CRM connection and/or the approved template name aren't set yet. Go to Settings → Follow-up reminders to finish setting it up."
        action={
          <button className="btn-primary" onClick={() => navigate('/settings')}>
            Go to Settings
          </button>
        }
      />
    )
  }

  if (!isApiMode && templates.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="No message templates yet"
        subtitle="Create at least one template on the Templates tab to start sending follow-ups."
      />
    )
  }

  return (
    <div className="space-y-4">
      {isApiMode && (
        <div className="card p-4 flex items-center gap-2.5 bg-brass/10 border-brass/20">
          <Zap size={15} className="text-brass-dark shrink-0" />
          <p className="text-xs text-ink">
            Automatic sending is on — messages go out through your WhatsApp CRM using{' '}
            <span className="font-medium">{settings.followUpTemplateName}</span>, with no manual step.
          </p>
        </div>
      )}

      {bulkState && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-medium text-ink flex items-center gap-2">
              {bulkState.done < bulkState.total ? (
                <>
                  <Loader2 size={15} className="animate-spin text-plum" /> Sending {bulkState.done} of {bulkState.total}…
                </>
              ) : (
                <>
                  <CheckCheck size={15} className="text-success" /> Done — {bulkState.done - bulkState.failed} sent
                  {bulkState.failed > 0 && `, ${bulkState.failed} failed`}
                </>
              )}
            </span>
            {bulkState.done >= bulkState.total && (
              <button onClick={() => setBulkState(null)} className="text-xs text-muted hover:text-ink underline">
                Dismiss
              </button>
            )}
          </div>
          <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-plum rounded-full transition-all"
              style={{ width: `${(bulkState.done / bulkState.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Search due clients…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button
          type="button"
          onClick={() => setMembersOnly((v) => !v)}
          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-3 rounded-lg text-xs font-semibold border transition-colors ${
            membersOnly ? 'bg-brass/15 border-brass/40 text-brass-dark' : 'bg-transparent border-black/10 text-muted hover:bg-black/5'
          }`}
          title="Show only clients with an active membership"
        >
          <Crown size={13} /> Members
          {memberDueCount > 0 && <span className="tabular">({memberDueCount})</span>}
        </button>
        {isApiMode ? (
          <div className="input sm:w-64 flex items-center gap-1.5 text-ink bg-black/[0.02]" title="Change the approved template name in Settings → Follow-up reminders">
            <Star size={13} className="text-brass fill-brass shrink-0" />
            <span className="truncate">{settings.followUpTemplateName}</span>
          </div>
        ) : (
          <select className="input sm:w-64" value={manualTemplateId} onChange={(e) => setManualTemplateId(e.target.value)}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.isDefault ? '(default)' : ''}
              </option>
            ))}
          </select>
        )}
        <button onClick={handleSendSelected} disabled={selected.size === 0} className="btn-brass shrink-0">
          <Send size={15} /> Send to selected ({selected.size})
        </button>
        {isApiMode && (
          <button
            onClick={() => sendBulkApi(filtered)}
            disabled={filtered.length === 0 || (bulkState && bulkState.done < bulkState.total)}
            className="btn-primary shrink-0"
          >
            <Zap size={15} /> Send to all due now
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CheckCheck}
          title={dueClients.length === 0 ? "You're all caught up" : 'No matches'}
          subtitle={
            dueClients.length === 0
              ? `No clients have gone quiet for ${settings.followUpDays}+ days right now.`
              : membersOnly
              ? 'No due members right now — try turning off "Members only".'
              : 'Try a different search term.'
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 bg-black/[0.02] border-b border-black/5 text-xs font-semibold uppercase tracking-wide text-muted">
            <input
              type="checkbox"
              checked={selected.size === filtered.length && filtered.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 accent-plum"
            />
            <span>Select all ({filtered.length})</span>
          </div>
          <div className="divide-y divide-black/5">
            {filtered.map((c) => {
              const message = previewFor(c)
              return (
                <div key={c.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="w-4 h-4 accent-plum shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-ink">{c.name}</p>
                      <Badge tone="danger">{daysSince(c.lastVisit)} days quiet</Badge>
                      {c.isMember && (
                        <Badge tone="brass">
                          <Crown size={11} className="inline -mt-0.5 mr-0.5" /> Member
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      <Phone size={11} /> {c.phone} · Last visit {formatDate(c.lastVisit)}
                    </p>
                    <p className="text-xs text-muted mt-1.5 italic line-clamp-2">{message}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => markContacted(c)} className="btn-ghost text-xs py-1.5">
                      Mark contacted
                    </button>
                    <button onClick={() => sendOne(c)} disabled={sendingId === c.id} className="btn-brass text-xs py-1.5">
                      {sendingId === c.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : isApiMode ? (
                        <Zap size={13} />
                      ) : (
                        <Send size={13} />
                      )}
                      {isApiMode ? 'Send' : 'WhatsApp'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!isApiMode && (
        <SendQueueModal
          open={queueOpen}
          onClose={() => setQueueOpen(false)}
          clients={filtered.filter((c) => selected.has(c.id))}
          template={selectedManualTemplate}
          onDone={() => {
            setSelected(new Set())
            setQueueOpen(false)
          }}
        />
      )}
    </div>
  )
}

function SendQueueModal({ open, onClose, clients, template, onDone }) {
  const { settings, logFollowUp } = useApp()
  const [index, setIndex] = useState(0)

  React.useEffect(() => {
    if (open) setIndex(0)
  }, [open])

  if (!open) return null
  const client = clients[index]
  const isLast = index >= clients.length - 1
  const message = client && template ? buildFollowUpMessage(template, client, settings) : ''

  function handleSend() {
    if (client && template) {
      window.open(whatsappLink(client.phone, message), '_blank', 'noopener,noreferrer')
      logFollowUp({ clientId: client.id, templateId: template.id, templateName: template.name, message, method: 'whatsapp' })
    }
    advance()
  }

  function handleSkip() {
    advance()
  }

  function advance() {
    if (isLast) {
      onDone()
    } else {
      setIndex((i) => i + 1)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Send queue" size="md">
      {!client ? (
        <p className="text-sm text-muted">Nothing left to send.</p>
      ) : (
        <div>
          <p className="text-xs text-muted mb-4">
            Client {index + 1} of {clients.length} — WhatsApp opens one chat per click, so we'll walk through the list together.
          </p>
          <div className="p-4 rounded-lg bg-black/[0.02] border border-black/5 mb-4">
            <p className="text-sm font-semibold text-ink">{client.name}</p>
            <p className="text-xs text-muted mb-3">{client.phone}</p>
            <p className="text-sm text-ink whitespace-pre-wrap">{message}</p>
          </div>
          <div className="flex items-center justify-between gap-2">
            <button onClick={handleSkip} className="btn-ghost">
              <SkipForward size={15} /> Skip
            </button>
            <button onClick={handleSend} className="btn-brass">
              <Send size={15} /> Send Message
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

const emptyTemplateForm = { name: '', body: '', isDefault: false }

function TemplatesTab() {
  const { templates, settings, upsertTemplate, deleteTemplate, updateSettings } = useApp()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyTemplateForm)
  const [confirmDelete, setConfirmDelete] = useState(null)

  function openAdd() {
    setForm(emptyTemplateForm)
    setEditingId(null)
    setModalOpen(true)
  }

  function openEdit(t) {
    setForm({ name: t.name, body: t.body, isDefault: !!t.isDefault })
    setEditingId(t.id)
    setModalOpen(true)
  }

  function handleSave() {
    if (!form.name.trim() || !form.body.trim()) return
    const id = editingId || uid('tpl')
    upsertTemplate({ id, ...form })
    if (form.isDefault) updateSettings({ followUpDefaultTemplateId: id })
    setModalOpen(false)
  }

  function handleDelete(t) {
    deleteTemplate(t.id)
    if (settings.followUpDefaultTemplateId === t.id) {
      const fallback = templates.find((x) => x.id !== t.id)
      updateSettings({ followUpDefaultTemplateId: fallback?.id || '' })
    }
    setConfirmDelete(null)
  }

  return (
    <div>
      {settings.followUpSendMode === 'api' && (
        <div className="card p-4 mb-6 flex items-start gap-3 bg-brass/10 border-brass/20">
          <Zap size={16} className="text-brass-dark mt-0.5 shrink-0" />
          <p className="text-xs text-ink">
            Automatic sending is on, so Follow-ups always sends the one fixed, Meta-approved template{' '}
            <span className="font-medium">{settings.followUpTemplateName}</span>, not the custom templates on this
            tab. Custom wording only applies in Manual mode. Change the approved template's name or language in{' '}
            <span className="font-medium">Settings → Follow-up reminders</span>.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted">Your own templates support tokens that auto-fill per client - used in Manual sending mode.</p>
        <button className="btn-primary shrink-0" onClick={openAdd}>
          <Plus size={16} /> Add Template
        </button>
      </div>

      <div className="card p-4 mb-6 flex items-start gap-3 bg-plum/5 border-plum/10">
        <Info size={16} className="text-plum mt-0.5 shrink-0" />
        <div className="text-xs text-ink">
          <p className="font-semibold mb-1">Available tokens</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted">
            {TOKEN_HELP.map(([token, desc]) => (
              <span key={token}>
                <span className="font-mono text-plum">{token}</span> — {desc}
              </span>
            ))}
          </div>
        </div>
      </div>

      {templates.length === 0 ? (
        <EmptyState icon={MessageSquareText} title="No templates yet" subtitle="Create your first follow-up message template." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="card p-5 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-ink flex items-center gap-1.5">
                  {t.name}
                  {t.isDefault && <Star size={13} className="text-brass fill-brass" />}
                </p>
              </div>
              <p className="text-sm text-muted whitespace-pre-wrap mb-4 flex-1">{t.body}</p>
              <div className="flex items-center gap-2 pt-3 border-t border-black/5">
                <button onClick={() => openEdit(t)} className="btn-ghost text-xs py-1.5 flex-1">
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={() => setConfirmDelete(t)} className="p-2 text-muted hover:text-danger">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit template' : 'Add template'}>
        <div className="space-y-3">
          <div>
            <label className="label">Template name</label>
            <input className="input" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} autoFocus />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea
              className="input"
              rows={5}
              value={form.body}
              onChange={(e) => setForm((s) => ({ ...s, body: e.target.value }))}
              placeholder="Hi {clientName}, it's been a while since your last visit to {salonName}…"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((s) => ({ ...s, isDefault: e.target.checked }))}
              className="w-4 h-4 accent-plum"
            />
            Set as default template
          </label>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button onClick={handleSave} className="btn-primary" disabled={!form.name.trim() || !form.body.trim()}>
              Save template
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete template?" size="sm">
        {confirmDelete && (
          <div>
            <p className="text-sm text-muted mb-5">
              Delete <span className="font-semibold text-ink">{confirmDelete.name}</span>? This won't affect messages already sent.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="btn-ghost">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="btn-danger">
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
