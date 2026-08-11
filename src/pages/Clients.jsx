import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import {
  Search,
  UserPlus,
  Users,
  Phone,
  Receipt,
  ArrowUpRight,
  Pencil,
  Trash2,
  Upload,
  Check,
} from "lucide-react";
import { useApp } from "../context/AppContext.jsx";
import { PageHeader, Modal, EmptyState, Badge } from "../components/ui.jsx";
import { formatCurrency, formatDate, uid } from "../utils/helpers.js";

// Accepts common header spellings from exported spreadsheets, case-insensitive
const HEADER_ALIASES = {
  name: ["name", "full name", "client name", "customer name"],
  phone: ["phone", "phone number", "mobile", "contact", "contact number"],
  email: ["email", "email address"],
  gender: ["gender", "sex"],
  notes: ["notes", "note", "remarks"],
  totalSpent: ["totalspent", "total spent", "spending", "total spend"],
  visits: ["visits", "visit", "total visits", "number of visits"],
  lastVisit: [
    "lastvisit",
    "last visit",
    "last visit date",
    "last service date",
  ],
};

function matchHeader(header) {
  const clean = header.trim().toLowerCase();
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(clean)) return field;
  }
  return null;
}

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  gender: "Female",
  notes: "",
};

export default function Clients() {
  const { clients, settings, upsertClient, deleteClient } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fieldMap = {};
        results.meta.fields.forEach((h) => {
          const matched = matchHeader(h);
          if (matched) fieldMap[h] = matched;
        });

        let added = 0;
        let updated = 0;
        let skipped = 0;

        results.data.forEach((row) => {
          const record = {};
          Object.entries(row).forEach(([header, value]) => {
            const field = fieldMap[header];
            if (field) record[field] = (value || "").toString().trim();
          });

          if (!record.name) {
            skipped += 1;
            return;
          }

          const existing = record.phone
            ? clients.find((c) => c.phone === record.phone)
            : null;
          const visitCount = record.visits
            ? Number(record.visits) || 0
            : existing?.visits?.length || 0;

          upsertClient({
            id: existing?.id || uid("cli"),
            name: record.name,
            phone: record.phone || "",
            email: record.email || "",
            gender: record.gender || "Female",
            notes: record.notes || "",

            totalSpent: record.totalSpent
              ? Number(record.totalSpent) || 0
              : existing?.totalSpent || 0,

            visits: record.visits
              ? Array.from({ length: visitCount }, (_, i) => ({
                  id: `imported-${i}`,
                  imported: true,
                }))
              : existing?.visits || [],

            lastVisit: record.lastVisit
              ? record.lastVisit
              : existing?.lastVisit || "",
          });
          existing ? (updated += 1) : (added += 1);
        });

        setImportResult({ added, updated, skipped });
      },
    });
    e.target.value = "";
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return clients
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q))
      .sort(
        (a, b) =>
          new Date(b.lastVisit || b.createdAt) -
          new Date(a.lastVisit || a.createdAt),
      );
  }, [clients, query]);

  function openAdd() {
    setForm(emptyForm);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(c) {
    setForm({
      name: c.name,
      phone: c.phone || "",
      email: c.email || "",
      gender: c.gender || "Female",
      notes: c.notes || "",
    });
    setEditingId(c.id);
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    upsertClient({ id: editingId || uid("cli"), ...form });
    setModalOpen(false);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Directory"
        title="Clients"
        subtitle={`${clients.length} client${clients.length === 1 ? "" : "s"} on file`}
        actions={
          <>
            <button
              className="btn-ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} /> Import CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportFile}
            />
            <button className="btn-primary" onClick={openAdd}>
              <UserPlus size={16} /> Add Client
            </button>
          </>
        }
      />

      <div className="relative mb-6 max-w-md">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          className="input pl-10"
          placeholder="Search by name or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={clients.length === 0 ? "No clients yet" : "No matches"}
          subtitle={
            clients.length === 0
              ? "Add your first client to start tracking visits and spend."
              : "Try a different search term."
          }
          action={
            clients.length === 0 && (
              <button className="btn-primary" onClick={openAdd}>
                <UserPlus size={16} /> Add Client
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="card p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-plum text-cream flex items-center justify-center text-sm font-semibold shrink-0">
                    {c.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="capitalize font-semibold text-ink truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-muted flex items-center gap-1">
                      <Phone size={11} /> {c.phone || "—"}
                    </p>
                  </div>
                </div>
                <Badge tone="plum">{c.gender || "Unisex"}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <div className="bg-black/[0.02] rounded-lg p-2.5">
                  <p className="text-muted mb-0.5">Total spent</p>
                  <p className="font-semibold text-ink tabular">
                    {formatCurrency(c.totalSpent || 0, settings.currencySymbol)}
                  </p>
                </div>
                <div className="bg-black/[0.02] rounded-lg p-2.5">
                  <p className="text-muted mb-0.5">Visits</p>
                  <p className="font-semibold text-ink tabular">
                    {c.visits?.length || 0}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted mb-4">
                {c.lastVisit
                  ? `Last visit ${formatDate(c.lastVisit)}`
                  : `Added ${formatDate(c.createdAt)}`}
              </p>

              <div className="flex items-center gap-2 mt-auto pt-3 border-t border-black/5">
                <button
                  onClick={() => navigate(`/clients/${c.id}`)}
                  className="btn-ghost text-xs py-1.5 flex-1"
                >
                  Profile <ArrowUpRight size={13} />
                </button>
                <button
                  onClick={() =>
                    navigate("/new-bill", { state: { clientId: c.id } })
                  }
                  className="btn-brass text-xs py-1.5 flex-1"
                >
                  <Receipt size={13} /> Bill
                </button>
                <button
                  onClick={() => openEdit(c)}
                  className="pl-2 text-muted hover:text-plum"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setConfirmDelete(c)}
                  className="pl-2 text-muted hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit client" : "Add client"}
      >
        <div className="space-y-3">
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) =>
                  setForm((s) => ({ ...s, phone: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label">Gender</label>
              <select
                className="input"
                value={form.gender}
                onChange={(e) =>
                  setForm((s) => ({ ...s, gender: e.target.value }))
                }
              >
                <option>Female</option>
                <option>Male</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Email (optional)</label>
            <input
              className="input"
              value={form.email}
              onChange={(e) =>
                setForm((s) => ({ ...s, email: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Preferred stylist, allergies, hair type…"
              value={form.notes}
              onChange={(e) =>
                setForm((s) => ({ ...s, notes: e.target.value }))
              }
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={() => setModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={!form.name.trim()}
            >
              Save client
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!importResult}
        onClose={() => setImportResult(null)}
        title="Import complete"
        size="sm"
      >
        {importResult && (
          <div>
            <div className="flex items-center gap-2 text-success text-sm font-medium mb-4">
              <Check size={16} /> CSV processed
            </div>
            <ul className="text-sm text-ink space-y-1.5 mb-5">
              <li>
                {importResult.added} new client
                {importResult.added === 1 ? "" : "s"} added
              </li>
              <li>
                {importResult.updated} existing client
                {importResult.updated === 1 ? "" : "s"} updated (matched by
                phone)
              </li>
              {importResult.skipped > 0 && (
                <li className="text-muted">
                  {importResult.skipped} row
                  {importResult.skipped === 1 ? "" : "s"} skipped (missing name)
                </li>
              )}
            </ul>
            <button
              onClick={() => setImportResult(null)}
              className="btn-primary w-full"
            >
              Done
            </button>
          </div>
        )}
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Remove client?"
        size="sm"
      >
        {confirmDelete && (
          <div>
            <p className="text-sm text-muted mb-5">
              This removes{" "}
              <span className="font-semibold text-ink">
                {confirmDelete.name}
              </span>{" "}
              from your directory. Past bills stay in billing history.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteClient(confirmDelete.id);
                  setConfirmDelete(null);
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
  );
}
