import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Search,
  UserPlus,
  User,
  Phone,
  X,
  Plus,
  Minus,
  Trash2,
  Scissors,
  Package,
  Printer,
  Download,
  ReceiptText,
  Check,
  Crown,
  Sparkles,
  CalendarPlus,
} from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { PageHeader, Modal, Badge } from '../components/ui.jsx'
import BillPreview from '../components/BillPreview.jsx'
import InvoiceWhatsAppButton from '../components/InvoiceWhatsAppButton.jsx'
import {
  calcBillTotals,
  calcLineTotal,
  isNoDiscountCategory,
  formatCurrency,
  formatDate,
  findActiveMembership,
  getMembershipDiscountInfo,
  getMembershipFreeServiceInfo,
  getComboServiceNames,
  matchesCatalogQuery,
  uid,
  capitalizeWordsPreserveSpaces,
  formatPhoneDisplay,
  getItemStaff,
  genderToServiceFilter,
  serviceMatchesGender,
  calcAdvanceSettlement,
  advanceBookingToReceipt,
  formatTimeLabel,
} from '../utils/helpers.js'
import { downloadBillPDF } from '../utils/pdf.js'

const PAYMENT_METHODS = ['Cash', 'Card', 'UPI', 'Wallet']
const GENDER_FILTERS = ['All', 'Male', 'Female']

function todayStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function NewBill() {
  const { clients, services, products, staff, settings, createBill, upsertClient, clientMemberships, membershipPlans, claimFreeServices, advanceBookings, createAdvanceBooking, updateAdvanceBooking } =
    useApp()
  const location = useLocation()
  const activeStaff = staff.filter((s) => s.active)

  // Client
  const [clientQuery, setClientQuery] = useState('')
  const [selectedClient, setSelectedClient] = useState(null)
  const [showNewClientForm, setShowNewClientForm] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', phone: '', email: '', gender: 'Female' })

  // Catalog
  const [catalogTab, setCatalogTab] = useState('service')
  const [catalogQuery, setCatalogQuery] = useState('')

  // Cart
  const [cart, setCart] = useState([])
  const [discountType, setDiscountType] = useState('none')
  const [discountValue, setDiscountValue] = useState('')
  const [taxPercent, setTaxPercent] = useState(settings.defaultTaxPercent || 0)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [billDate, setBillDate] = useState(() => new Date().toISOString().slice(0, 10))

  const [generatedBill, setGeneratedBill] = useState(null)

  // Services shown in the catalog: All, or only Male / Female (Unisex
  // services always show). Pre-selected from the client's gender below.
  const [serviceGender, setServiceGender] = useState('All')

  // 'bill' = a normal bill. 'advance' = take an advance now and book the
  // client in; the final bill is generated later from Advance Bookings.
  const [mode, setMode] = useState('bill')
  const [advanceForm, setAdvanceForm] = useState({ bookingDate: todayStr(), date: todayStr(), time: '', amount: '', method: 'Cash', notes: '' })
  const [generatedReceipt, setGeneratedReceipt] = useState(null)
  // The advance booking currently being turned into a final bill, if any.
  const [finalising, setFinalising] = useState(null)

  useEffect(() => {
    // Finalising an advance booking: load its client, items and discounts so
    // everything can still be edited (discounts included) like a normal bill.
    const bookingId = location.state?.advanceBookingId
    if (bookingId) {
      const booking = advanceBookings.find((b) => b.id === bookingId && b.status === 'booked')
      if (booking) {
        setMode('bill')
        setFinalising(booking)
        setCart(
          booking.items.map((it) => {
            const staffList = getItemStaff(it)
            return {
              ...it,
              staffIds: staffList.map((x) => x.id),
              staffNames: staffList.map((x) => x.name),
              isFreeClaim: false,
            }
          }),
        )
        setDiscountType(booking.discountType || 'none')
        setDiscountValue(booking.discountValue || '')
        setTaxPercent(booking.taxPercent ?? (settings.defaultTaxPercent || 0))
        const client = booking.client?.id ? clients.find((c) => c.id === booking.client.id) : null
        if (client) {
          setSelectedClient(client)
        } else if (booking.client?.name) {
          setShowNewClientForm(true)
          setNewClient({ name: booking.client.name, phone: booking.client.phone || '', email: '', gender: booking.gender || 'Female' })
        }
        return
      }
    }
    const clientId = location.state?.clientId
    if (clientId) {
      const client = clients.find((c) => c.id === clientId)
      if (client) setSelectedClient(client)
      return
    }
    // Coming from an appointment for a client we don't have on file yet
    // (e.g. their first-ever booking on the salon website) — open the "new
    // client" form pre-filled instead of leaving the front desk to retype it.
    const prefill = location.state?.prefillClient
    if (prefill) {
      setShowNewClientForm(true)
      setNewClient({ name: prefill.name || '', phone: prefill.phone || '', email: '', gender: prefill.gender || 'Female' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state])

  const clientMatches = useMemo(() => {
    if (!clientQuery.trim()) return []
    const q = clientQuery.toLowerCase()
    return clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone?.includes(q)).slice(0, 6)
  }, [clientQuery, clients])

  // Whoever is being billed decides which services are offered: a male
  // client sees only male (and unisex) services, and so on. Staff can still
  // override with the chips above the list - e.g. for a walk-in.
  const clientGender = selectedClient ? selectedClient.gender : showNewClientForm ? newClient.gender : null
  useEffect(() => {
    setServiceGender(genderToServiceFilter(clientGender))
  }, [clientGender])

  const catalogList = catalogTab === 'service' ? services : products
  const filteredCatalog = useMemo(() => {
    return catalogList.filter(
      (item) => matchesCatalogQuery(item, catalogQuery) && (catalogTab !== 'service' || serviceMatchesGender(item, serviceGender)),
    )
  }, [catalogList, catalogQuery, catalogTab, serviceGender])

  // Tracks the member discount percentage that was last auto-applied per
  // item type (service/product). Used to tell an untouched, auto-discounted
  // line apart from one the staff has since edited by hand, so re-syncing
  // the membership discount never clobbers a manual override.
  const lastAutoDiscountRef = useRef({ service: 0, product: 0 })

  function addToCart(item, type) {
    setCart((prev) => {
      const existing = prev.find((c) => c.refId === item.id && c.type === type)
      if (existing) {
        return prev.map((c) => (c.refId === item.id && c.type === type ? { ...c, qty: c.qty + 1 } : c))
      }
      const autoDiscount = lastAutoDiscountRef.current[type] || 0
      return [
        ...prev,
        {
          refId: item.id,
          type,
          name: item.name,
          price: item.price,
          category: item.category || '',
          qty: 1,
          discountPercent: isNoDiscountCategory(item.category) ? 0 : autoDiscount,
          staffId: '',
          staffName: '',
          staffIds: [],
          staffNames: [],
          isFreeClaim: false,
          isCombo: !!item.isCombo,
          comboItems: item.isCombo ? getComboServiceNames(item, services) : [],
        },
      ]
    })
  }

  function updateQty(refId, type, delta) {
    setCart((prev) =>
      prev
        .map((c) => (c.refId === refId && c.type === type ? { ...c, qty: Math.max(1, c.qty + delta) } : c))
        .filter((c) => c.qty > 0),
    )
  }

  function updateItemDiscount(refId, type, value) {
    const clamped = Math.max(0, Math.min(100, Number(value) || 0))
    setCart((prev) =>
      prev.map((c) =>
        c.refId === refId && c.type === type && !isNoDiscountCategory(c.category)
          ? { ...c, discountPercent: clamped, isFreeClaim: false }
          : c,
      ),
    )
  }

  // A line can have several staff. staffId/staffName keep the first person's
  // id and the joined names so anything reading the older single-staff
  // fields still shows something sensible.
  function setLineStaff(c, ids) {
    const members = ids.map((id) => activeStaff.find((s) => s.id === id)).filter(Boolean)
    return {
      ...c,
      staffIds: members.map((m) => m.id),
      staffNames: members.map((m) => m.name),
      staffId: members[0]?.id || '',
      staffName: members.map((m) => m.name).join(' & '),
    }
  }

  function addItemStaff(refId, type, staffId) {
    if (!staffId) return
    setCart((prev) =>
      prev.map((c) =>
        c.refId === refId && c.type === type && !(c.staffIds || []).includes(staffId)
          ? setLineStaff(c, [...(c.staffIds || []), staffId])
          : c,
      ),
    )
  }

  function removeItemStaff(refId, type, staffId) {
    setCart((prev) =>
      prev.map((c) =>
        c.refId === refId && c.type === type ? setLineStaff(c, (c.staffIds || []).filter((id) => id !== staffId)) : c,
      ),
    )
  }

  function removeFromCart(refId, type) {
    setCart((prev) => prev.filter((c) => !(c.refId === refId && c.type === type)))
  }

  const totals = useMemo(
    () => calcBillTotals({ items: cart, discountType, discountValue, taxPercent }),
    [cart, discountType, discountValue, taxPercent],
  )

  // Bill date as an actual Date object, used both for generating the bill
  // and for checking whether it falls in a birthday/anniversary week.
  const billDateObj = useMemo(() => {
    const d = new Date()
    const [y, m, dd] = billDate.split('-').map(Number)
    d.setFullYear(y, m - 1, dd)
    return d
  }, [billDate])

  const activeMembership = useMemo(
    () => findActiveMembership(selectedClient?.id, clientMemberships),
    [selectedClient?.id, clientMemberships],
  )
  const activeMembershipPlan = useMemo(
    () => (activeMembership ? membershipPlans.find((p) => p.id === activeMembership.planId) : null),
    [activeMembership, membershipPlans],
  )
  const membershipDiscount = useMemo(
    () => getMembershipDiscountInfo(selectedClient, activeMembership, activeMembershipPlan, billDateObj),
    [selectedClient, activeMembership, activeMembershipPlan, billDateObj],
  )
  const freeServiceInfo = useMemo(
    () => getMembershipFreeServiceInfo(activeMembership, activeMembershipPlan, billDateObj),
    [activeMembership, activeMembershipPlan, billDateObj],
  )

  // How many free-service credits the current cart is already claiming
  // (summed by quantity, since claiming a line with qty > 1 uses one credit
  // per unit), so the UI can stop offering the claim option once the
  // membership's remaining allowance for this bill is used up.
  const claimedFreeQty = useMemo(() => cart.filter((c) => c.isFreeClaim).reduce((sum, c) => sum + c.qty, 0), [cart])
  const freeCreditsLeftForBill = freeServiceInfo ? Math.max(0, freeServiceInfo.remaining - claimedFreeQty) : 0

  function toggleFreeClaim(refId, type) {
    setCart((prev) =>
      prev.map((c) => {
        if (c.refId !== refId || c.type !== type || isNoDiscountCategory(c.category)) return c
        if (c.isFreeClaim) {
          // Un-claim: fall back to whatever discount the membership would
          // otherwise auto-apply for this item type.
          const restored = c.type === 'service' ? membershipDiscount?.service?.total || 0 : membershipDiscount?.product?.total || 0
          return { ...c, isFreeClaim: false, discountPercent: restored }
        }
        return { ...c, isFreeClaim: true, discountPercent: 100 }
      }),
    )
  }

  // Auto-apply the member's discount (plan discount + birthday/anniversary
  // bonus, if this week) per cart line, using the service rate for services
  // and the product rate for products. Only lines still sitting at the
  // previously auto-applied value are updated, so a staff member's manual
  // per-item override is never overwritten.
  useEffect(() => {
    const nextAuto = membershipDiscount
      ? { service: membershipDiscount.service.total, product: membershipDiscount.product.total }
      : { service: 0, product: 0 }
    const prevAuto = lastAutoDiscountRef.current

    setCart((prev) =>
      prev.map((c) => {
        if (c.isFreeClaim) return c
        if (isNoDiscountCategory(c.category)) return c
        const current = Number(c.discountPercent) || 0
        if (current === (prevAuto[c.type] || 0)) {
          return { ...c, discountPercent: nextAuto[c.type] || 0 }
        }
        return c
      }),
    )
    lastAutoDiscountRef.current = nextAuto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient?.id, membershipDiscount?.service?.total, membershipDiscount?.product?.total])

  function resolveClient() {
    if (selectedClient) return selectedClient
    if (showNewClientForm && newClient.name.trim()) {
      const client = { id: uid('cli'), ...newClient, name: capitalizeWordsPreserveSpaces(newClient.name) }
      upsertClient(client)
      return client
    }
    return null
  }

  const settlement = useMemo(
    () => calcAdvanceSettlement(totals.total, finalising?.advanceAmount),
    [totals.total, finalising],
  )

  function cartStaffList() {
    const map = new Map()
    cart.forEach((c) => getItemStaff(c).forEach((st) => st.id && map.set(st.id, { id: st.id, name: st.name })))
    return Array.from(map.values())
  }

  function handleGenerateBill() {
    if (cart.length === 0) return
    const client = resolveClient()
    const advanceFields = finalising
      ? {
          advanceBookingId: finalising.id,
          advanceReceiptNo: finalising.receiptNo,
          advancePaid: Number(finalising.advanceAmount) || 0,
          advanceMethod: finalising.advanceMethod,
          ...settlement,
        }
      : {}
    const bill = createBill({
      client: client ? { id: client.id, name: capitalizeWordsPreserveSpaces(client.name), phone: client.phone } : { name: 'Walk-in Customer' },
      staffList: cartStaffList(),
      items: cart,
      date: billDateObj.toISOString(),
      discountType,
      discountValue: Number(discountValue) || 0,
      taxPercent: Number(taxPercent) || 0,
      ...totals,
      paymentMethod,
      ...advanceFields,
    })
    // Deduct any claimed free services from the membership's remaining
    // allowance so the next bill sees an accurate count.
    if (activeMembership && claimedFreeQty > 0) {
      claimFreeServices(activeMembership.id, claimedFreeQty)
    }
    if (finalising) {
      updateAdvanceBooking(finalising.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        billId: bill.id,
        billNo: bill.billNo,
      })
    }
    setGeneratedBill(bill)
  }

  const advanceAmountNum = Number(advanceForm.amount) || 0
  const advanceError = (() => {
    if (!advanceForm.bookingDate) return 'Pick the booking date.'
    if (advanceForm.bookingDate > todayStr()) return 'The booking date can\u2019t be in the future.'
    if (!advanceForm.date) return 'Pick the appointment date.'
    if (advanceForm.date < advanceForm.bookingDate) return 'The appointment can\u2019t be before the booking date.'
    if (!(advanceAmountNum > 0)) return 'Enter the advance amount received.'
    if (advanceAmountNum > totals.total) return 'The advance can\u2019t be more than the estimated total.'
    if (!selectedClient && !(showNewClientForm && newClient.name.trim())) return 'Select or add the client — an advance booking needs a client.'
    return ''
  })()

  function handleGenerateAdvance() {
    if (cart.length === 0 || advanceError) return
    const client = resolveClient()
    // Booking date = the day the advance was received (can be backdated).
    // Keep the current time of day so receipts sort sensibly.
    const [by, bm, bd] = advanceForm.bookingDate.split('-').map(Number)
    const createdAt = new Date()
    createdAt.setFullYear(by, bm - 1, bd)
    const booking = createAdvanceBooking({
      createdAt: createdAt.toISOString(),
      client: { id: client.id, name: capitalizeWordsPreserveSpaces(client.name), phone: client.phone },
      gender: client.gender || '',
      scheduledDate: advanceForm.date,
      scheduledTime: advanceForm.time,
      notes: advanceForm.notes.trim(),
      staffList: cartStaffList(),
      items: cart,
      discountType,
      discountValue: Number(discountValue) || 0,
      taxPercent: Number(taxPercent) || 0,
      ...totals,
      advanceAmount: advanceAmountNum,
      advanceMethod: advanceForm.method,
    })
    setGeneratedReceipt(booking)
  }

  function resetForm() {
    setCart([])
    setSelectedClient(null)
    setShowNewClientForm(false)
    setNewClient({ name: '', phone: '', email: '', gender: 'Female' })
    setClientQuery('')
    setDiscountType('none')
    setDiscountValue('')
    setPaymentMethod('Cash')
    setBillDate(new Date().toISOString().slice(0, 10))
    setGeneratedBill(null)
    setGeneratedReceipt(null)
    setFinalising(null)
    setMode('bill')
    setAdvanceForm({ bookingDate: todayStr(), date: todayStr(), time: '', amount: '', method: 'Cash', notes: '' })
  }

  const canGenerate = cart.length > 0 && cart.every((c) => getItemStaff(c).some((st) => st.id))

  return (
    <div>
      <PageHeader
        eyebrow="Front Desk"
        title={finalising ? 'Finalise Bill' : mode === 'advance' ? 'Advance Booking' : 'New Bill'}
        subtitle={
          finalising
            ? 'Review the services, apply any discount, and collect the balance.'
            : mode === 'advance'
              ? 'Book the client in advance, take the advance payment and generate the receipt.'
              : 'Add a client, pick services or products, and generate the invoice.'
        }
      />

      {!finalising && (
        <div className="inline-flex p-1 rounded-full bg-black/5 mb-6">
          <button
            onClick={() => setMode('bill')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-colors ${
              mode === 'bill' ? 'bg-plum text-cream' : 'text-muted hover:text-ink'
            }`}
          >
            <ReceiptText size={14} /> Regular bill
          </button>
          <button
            onClick={() => setMode('advance')}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-colors ${
              mode === 'advance' ? 'bg-plum text-cream' : 'text-muted hover:text-ink'
            }`}
          >
            <CalendarPlus size={14} /> Advance booking
          </button>
        </div>
      )}

      {finalising && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-3.5 rounded-lg bg-brass/10 border border-brass/30 text-sm">
          <p className="text-ink">
            Finalising advance booking <span className="font-mono font-semibold">{finalising.receiptNo}</span> — advance of{' '}
            <span className="font-semibold">{formatCurrency(finalising.advanceAmount, settings.currencySymbol)}</span> paid via{' '}
            {finalising.advanceMethod} will be deducted from the total.
          </p>
          <button
            onClick={() => {
              setFinalising(null)
              resetForm()
            }}
            className="btn-ghost text-xs py-1.5"
          >
            <X size={13} /> Discard
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Client Details */}
          <section className="card p-5 sm:p-6">
            <p className="font-display text-lg text-ink mb-4">1. Client details</p>

            {selectedClient ? (
              <div>
                <div className="flex items-center justify-between p-3.5 rounded-lg bg-plum/5 border border-plum/15">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-plum text-cream flex items-center justify-center text-sm font-semibold">
                      {selectedClient.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
                        {selectedClient.name}
                        {activeMembership && (
                          <Crown
                            size={14}
                            className="text-brass-dark shrink-0"
                            title={`${activeMembershipPlan?.name || 'Member'} — active till ${formatDate(activeMembership.expiryDate)}`}
                          />
                        )}
                      </p>
                      <p className="text-xs text-muted">{formatPhoneDisplay(selectedClient.phone)}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedClient(null)} className="text-muted hover:text-danger p-1">
                    <X size={16} />
                  </button>
                </div>
                {membershipDiscount && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-brass-dark bg-brass/10 rounded-lg px-3 py-2">
                    <Crown size={13} className="shrink-0" />
                    <span>
                      {activeMembershipPlan?.name} member — {membershipDiscount.service.total}% off services ·{' '}
                      {membershipDiscount.product.total}% off products applied to the cart
                      {(membershipDiscount.service.bonusDiscount > 0 || membershipDiscount.product.bonusDiscount > 0) &&
                        ` (includes the birthday / anniversary event extra discount)`}
                    </span>
                  </div>
                )}
                {freeServiceInfo && (
                  <div
                    className={`mt-2 flex items-center gap-1.5 text-xs rounded-lg px-3 py-2 ${
                      freeServiceInfo.eligible ? 'text-success bg-success/10' : 'text-muted bg-black/[0.03]'
                    }`}
                  >
                    <Check size={13} className="shrink-0" />
                    {freeServiceInfo.eligible ? (
                      <span>
                        {freeCreditsLeftForBill} of {freeServiceInfo.totalFree} free service{freeServiceInfo.totalFree === 1 ? '' : 's'}{' '}
                        left to claim — valid till {formatDate(freeServiceInfo.windowEnd)}. Tick "Claim free" on an eligible service below.
                      </span>
                    ) : !freeServiceInfo.withinWindow ? (
                      <span>Free-service window ended on {formatDate(freeServiceInfo.windowEnd)} — regular member discount applies.</span>
                    ) : (
                      <span>All {freeServiceInfo.totalFree} free service{freeServiceInfo.totalFree === 1 ? '' : 's'} already claimed.</span>
                    )}
                  </div>
                )}
              </div>
            ) : showNewClientForm ? (
              <div className="space-y-3 p-3.5 rounded-lg bg-black/[0.02] border border-black/5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">New client</p>
                  <button onClick={() => setShowNewClientForm(false)} className="text-muted hover:text-danger">
                    <X size={15} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="input"
                    placeholder="Full name"
                    value={newClient.name}
                    onChange={(e) => setNewClient((s) => ({ ...s, name: capitalizeWordsPreserveSpaces(e.target.value) }))}
                  />
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted font-medium pointer-events-none">
                      +91
                    </span>
                    <input
                      className="input pl-12"
                      placeholder="Phone number"
                      value={newClient.phone}
                      onChange={(e) => setNewClient((s) => ({ ...s, phone: e.target.value.replace(/[^0-9]/g, '').slice(0, 10) }))}
                    />
                  </div>
                  <input
                    className="input"
                    placeholder="Email (optional)"
                    value={newClient.email}
                    onChange={(e) => setNewClient((s) => ({ ...s, email: e.target.value }))}
                  />
                  <select
                    className="input"
                    value={newClient.gender}
                    onChange={(e) => setNewClient((s) => ({ ...s, gender: e.target.value }))}
                  >
                    <option>Female</option>
                    <option>Male</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <div className="relative mb-2">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    className="input pl-10"
                    placeholder="Search client by name or phone…"
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                  />
                </div>
                {clientMatches.length > 0 && (
                  <div className="border border-black/10 rounded-lg divide-y divide-black/5 mb-3 overflow-hidden">
                    {clientMatches.map((c) => {
                      const isMember = !!findActiveMembership(c.id, clientMemberships)
                      return (
                        <button
                          key={c.id}
                          onClick={() => {
                            setSelectedClient(c)
                            setClientQuery('')
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-black/[0.03] text-left"
                        >
                          <User size={14} className="text-muted" />
                          <span className="text-sm font-medium text-ink flex items-center gap-1.5">
                            {c.name}
                            {isMember && <Crown size={12} className="text-brass-dark" />}
                          </span>
                          <span className="text-xs text-muted ml-auto">{formatPhoneDisplay(c.phone)}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowNewClientForm(true)} className="btn-ghost text-sm py-2">
                    <UserPlus size={15} /> New client
                  </button>
                  <span className="text-xs text-muted">or leave blank to bill a walk-in customer</span>
                </div>
              </div>
            )}
          </section>

          {/* Services & Products */}
          <section className="card p-5 sm:p-6">
            <p className="font-display text-lg text-ink mb-4">2. Services &amp; products</p>

            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setCatalogTab('service')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  catalogTab === 'service' ? 'bg-plum text-cream' : 'bg-black/5 text-muted hover:bg-black/10'
                }`}
              >
                <Scissors size={13} /> Services
              </button>
              <button
                onClick={() => setCatalogTab('product')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  catalogTab === 'product' ? 'bg-plum text-cream' : 'bg-black/5 text-muted hover:bg-black/10'
                }`}
              >
                <Package size={13} /> Products
              </button>
            </div>

            {catalogTab === 'service' && (
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs text-muted">Show services for:</span>
                {GENDER_FILTERS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setServiceGender(g)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      serviceGender === g ? 'bg-brass/20 border-brass text-ink' : 'border-black/10 text-muted hover:bg-black/5'
                    }`}
                  >
                    {g === 'All' ? 'All' : g === 'Male' ? 'Men' : 'Women'}
                  </button>
                ))}
                {serviceGender !== 'All' && <span className="text-[11px] text-muted">(unisex services are always shown)</span>}
              </div>
            )}

            <div className="relative mb-3">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input pl-10"
                placeholder={`Search ${catalogTab === 'service' ? 'services' : 'products'} by name or category…`}
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
              {filteredCatalog.map((item) => {
                const inCartQty = cart.find((c) => c.refId === item.id && c.type === catalogTab)?.qty
                const outOfStock = catalogTab === 'product' && item.stock <= 0
                const isFreeEligible = catalogTab === 'service' && freeServiceInfo?.eligible && freeServiceInfo.serviceIds.includes(item.id)
                return (
                  <button
                    key={item.id}
                    disabled={outOfStock}
                    onClick={() => addToCart(item, catalogTab)}
                    className="flex items-center justify-between gap-2 p-3 rounded-lg border border-black/10 hover:border-brass hover:bg-brass/5 text-left transition-colors disabled:opacity-40 disabled:hover:border-black/10 disabled:hover:bg-transparent"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate flex items-center gap-1.5">
                        {item.name}
                        {isFreeEligible && <Badge tone="success">Free eligible</Badge>}
                        {catalogTab === 'service' && item.isCombo && (
                          <Badge tone="brass">
                            <Sparkles size={10} className="inline -mt-0.5 mr-0.5" /> Combo
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted">
                        {formatCurrency(item.price, settings.currencySymbol)}
                        {catalogTab === 'product' && ` · ${item.stock} in stock`}
                      </p>
                    </div>
                    {inCartQty ? (
                      <span className="shrink-0 w-6 h-6 rounded-full bg-brass text-ink text-xs font-bold flex items-center justify-center">
                        {inCartQty}
                      </span>
                    ) : (
                      <Plus size={16} className="text-plum shrink-0" />
                    )}
                  </button>
                )
              })}
              {filteredCatalog.length === 0 && (
                <p className="text-sm text-muted col-span-2 py-6 text-center">No results found.</p>
              )}
            </div>
          </section>

          {mode === 'advance' && (
            <section className="card p-5 sm:p-6">
              <p className="font-display text-lg text-ink mb-4">3. Booking &amp; advance payment</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Booking date (advance received on)</label>
                  <input
                    type="date"
                    className="input"
                    max={todayStr()}
                    value={advanceForm.bookingDate}
                    onChange={(e) => setAdvanceForm((f) => ({ ...f, bookingDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Appointment date</label>
                  <input
                    type="date"
                    className="input"
                    min={advanceForm.bookingDate || todayStr()}
                    value={advanceForm.date}
                    onChange={(e) => setAdvanceForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Appointment time</label>
                  <input
                    type="time"
                    className="input"
                    value={advanceForm.time}
                    onChange={(e) => setAdvanceForm((f) => ({ ...f, time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Advance amount received ({settings.currencySymbol})</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    placeholder="0"
                    value={advanceForm.amount}
                    onChange={(e) => setAdvanceForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">Advance paid via</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setAdvanceForm((f) => ({ ...f, method: m }))}
                        className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                          advanceForm.method === m ? 'bg-plum text-cream border-plum' : 'border-black/10 text-muted hover:bg-black/5'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Notes (optional)</label>
                  <input
                    className="input"
                    placeholder="e.g. bridal trial, prefers a female stylist"
                    value={advanceForm.notes}
                    onChange={(e) => setAdvanceForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
              <p className="text-xs text-muted mt-3">
                You can still give discounts when the bill is finalised on the day — the services, staff and discount here are an estimate.
              </p>
            </section>
          )}
        </div>

        {/* Cart / Summary */}
        <div className="lg:sticky lg:top-20 h-fit space-y-4">
          <section className="card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="font-display text-lg text-ink">Bill summary</p>
              <div className="shrink-0">
                {mode === 'bill' && <input
                  type="date"
                  value={billDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brass/60 focus:border-brass"
                  title="Bill date"
                />}
              </div>
            </div>

            {activeStaff.length === 0 && (
              <p className="text-xs text-danger mb-4 p-2.5 rounded-lg bg-danger/5">
                No active staff found — add one from the Staff page before billing.
              </p>
            )}

            {cart.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center">Add services or products to build the bill.</p>
            ) : (
              <div className="space-y-4 mb-4 max-h-72 overflow-y-auto pr-1">
                {cart.map((c) => {
                  const line = calcLineTotal(c)
                  const canClaimFree =
                    c.type === 'service' &&
                    !isNoDiscountCategory(c.category) &&
                    freeServiceInfo?.eligible &&
                    freeServiceInfo.serviceIds.includes(c.refId) &&
                    (c.isFreeClaim || freeCreditsLeftForBill >= c.qty)
                  return (
                    <div key={`${c.type}-${c.refId}`} className="pb-4 border-b border-black/5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink truncate flex items-center gap-1.5">
                            {c.name}
                            {c.isCombo && (
                              <Badge tone="brass">
                                <Sparkles size={10} className="inline -mt-0.5 mr-0.5" /> Combo
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted">{formatCurrency(c.price, settings.currencySymbol)} each</p>
                          {c.isCombo && c.comboItems?.length > 0 && (
                            <p className="text-[11px] text-muted mt-0.5 truncate">Includes: {c.comboItems.join(', ')}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => updateQty(c.refId, c.type, -1)}
                            className="w-6 h-6 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="text-sm tabular w-4 text-center">{c.qty}</span>
                          <button
                            onClick={() => updateQty(c.refId, c.type, 1)}
                            className="w-6 h-6 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5"
                          >
                            <Plus size={11} />
                          </button>
                          <button
                            onClick={() => removeFromCart(c.refId, c.type)}
                            className="text-muted hover:text-danger ml-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2">
                        {getItemStaff(c).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-1.5">
                            {getItemStaff(c).map((st) => (
                              <span
                                key={st.id}
                                className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-plum/10 text-plum text-[11px] font-medium"
                              >
                                {st.name}
                                <button
                                  onClick={() => removeItemStaff(c.refId, c.type, st.id)}
                                  className="w-4 h-4 rounded-full hover:bg-plum/20 flex items-center justify-center"
                                  title={`Remove ${st.name}`}
                                >
                                  <X size={10} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <select
                          value=""
                          onChange={(e) => addItemStaff(c.refId, c.type, e.target.value)}
                          className="w-full rounded-md border px-2 py-1.5 text-xs focus:outline-none"
                        >
                          <option value="">{getItemStaff(c).length > 0 ? 'Add another staff…' : 'Assign staff…'}</option>
                          {activeStaff
                            .filter((st) => !(c.staffIds || []).includes(st.id))
                            .map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name} — {st.role}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="flex items-center gap-1.5">
                          {isNoDiscountCategory(c.category) ? (
                            <span className="text-[11px] text-muted italic">No discount (already a combo price)</span>
                          ) : (
                            <>
                              <label className="text-[11px] text-muted">Item discount</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={c.discountPercent || ''}
                                onChange={(e) => updateItemDiscount(c.refId, c.type, e.target.value)}
                                placeholder="0"
                                disabled={c.isFreeClaim}
                                className="w-14 rounded-md border border-black/10 px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brass/60 focus:border-brass disabled:opacity-50"
                              />
                              <span className="text-[11px] text-muted">%</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs tabular">
                          {line.discount > 0 && (
                            <span className="text-muted line-through mr-1.5">{formatCurrency(line.gross, settings.currencySymbol)}</span>
                          )}
                          <span className="font-semibold text-ink">{formatCurrency(line.net, settings.currencySymbol)}</span>
                        </p>
                      </div>
                      {canClaimFree && (
                        <label className="flex items-center gap-1.5 mt-2 text-[11px] text-success cursor-pointer">
                          <input type="checkbox" checked={c.isFreeClaim} onChange={() => toggleFreeClaim(c.refId, c.type)} />
                          Claim as free membership service (100% off)
                        </label>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="space-y-3 pt-4 border-t border-black/5">
              <div className="grid grid-cols-2 gap-2">
                <select className="input" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                  <option value="none">No discount</option>
                  <option value="percent">Discount %</option>
                  <option value="flat">Discount flat</option>
                </select>
                <input
                  className="input"
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={discountType === 'none'}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                />
              </div>
              {discountType !== 'none' && cart.some((c) => isNoDiscountCategory(c.category)) && (
                <p className="text-[11px] text-muted -mt-1.5">
                  This won't be applied to Special Combo items — they're already discounted.
                </p>
              )}
              <div>
                <label className="label">Tax %</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value)}
                />
              </div>
              {mode === 'bill' && (
              <div>
                <label className="label">{finalising ? 'Balance payment method' : 'Payment method'}</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        paymentMethod === m ? 'bg-plum text-cream border-plum' : 'border-black/10 text-muted hover:bg-black/5'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              )}
            </div>

            <div className="space-y-1.5 pt-4 mt-4 border-t border-black/5 text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="tabular">{formatCurrency(totals.grossSubtotal, settings.currencySymbol)}</span>
              </div>
              {totals.itemDiscountTotal > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Item discounts</span>
                  <span className="tabular">-{formatCurrency(totals.itemDiscountTotal, settings.currencySymbol)}</span>
                </div>
              )}
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Discount</span>
                  <span className="tabular">-{formatCurrency(totals.discountAmount, settings.currencySymbol)}</span>
                </div>
              )}
              {totals.taxAmount > 0 && (
                <div className="flex justify-between text-muted">
                  <span>Tax</span>
                  <span className="tabular">{formatCurrency(totals.taxAmount, settings.currencySymbol)}</span>
                </div>
              )}
              <div className="flex justify-between font-display text-xl text-plum pt-2">
                <span>{mode === 'advance' ? 'Estimated total' : 'Total'}</span>
                <span className="tabular">{formatCurrency(totals.total, settings.currencySymbol)}</span>
              </div>
              {mode === 'advance' && (
                <>
                  <div className="flex justify-between text-success font-medium">
                    <span>Advance received</span>
                    <span className="tabular">-{formatCurrency(advanceAmountNum, settings.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-ink pt-1.5 border-t border-black/5">
                    <span>Due at visit</span>
                    <span className="tabular">{formatCurrency(Math.max(0, totals.total - advanceAmountNum), settings.currencySymbol)}</span>
                  </div>
                </>
              )}
              {finalising && (
                <>
                  <div className="flex justify-between text-success font-medium">
                    <span>Advance paid ({finalising.receiptNo})</span>
                    <span className="tabular">-{formatCurrency(settlement.advanceApplied, settings.currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between font-display text-lg text-ink pt-1.5 border-t border-black/5">
                    <span>Balance to pay</span>
                    <span className="tabular">{formatCurrency(settlement.balanceDue, settings.currencySymbol)}</span>
                  </div>
                  {settlement.refundDue > 0 && (
                    <p className="text-xs text-danger">
                      The advance is {formatCurrency(settlement.refundDue, settings.currencySymbol)} more than this bill — refund that to the client.
                    </p>
                  )}
                </>
              )}
            </div>

            {mode === 'advance' ? (
              <button onClick={handleGenerateAdvance} disabled={!canGenerate || !!advanceError} className="btn-primary w-full py-3 mt-5">
                <CalendarPlus size={16} /> Generate Advance Receipt
              </button>
            ) : (
              <button onClick={handleGenerateBill} disabled={!canGenerate} className="btn-primary w-full py-3 mt-5">
                <ReceiptText size={16} /> Generate Bill
              </button>
            )}
            {mode === 'advance' && canGenerate && advanceError && (
              <p className="text-xs text-danger text-center mt-2">{advanceError}</p>
            )}
            {cart.length > 0 && !canGenerate && (
              <p className="text-xs text-danger text-center mt-2">Assign a staff member to every item to continue.</p>
            )}
          </section>
        </div>
      </div>

      {/* Success modal */}
      <Modal open={!!generatedBill} onClose={resetForm} title="Bill generated" size="lg">
        {generatedBill && (
          <div>
            <div className="flex items-center gap-2 mb-4 text-success text-sm font-medium">
              <Check size={16} /> Saved to billing history &amp; client profile
            </div>
            <div className="border border-black/10 rounded-xl overflow-hidden mb-5">
              <BillPreview bill={generatedBill} settings={settings} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => window.print()} className="btn-ghost">
                <Printer size={15} /> Print
              </button>
              <button onClick={() => downloadBillPDF(generatedBill, settings)} className="btn-ghost">
                <Download size={15} /> Download PDF
              </button>
              <InvoiceWhatsAppButton bill={generatedBill} settings={settings} />
              <button onClick={resetForm} className="btn-primary ml-auto">
                Start new bill
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Advance receipt modal */}
      <Modal open={!!generatedReceipt} onClose={resetForm} title="Advance receipt generated" size="lg">
        {generatedReceipt && (
          <div>
            <div className="flex items-center gap-2 mb-4 text-success text-sm font-medium">
              <Check size={16} /> Booking saved — finalise it from Advance Bookings when the client visits
            </div>
            <div className="border border-black/10 rounded-xl overflow-hidden mb-5">
              <BillPreview bill={advanceBookingToReceipt(generatedReceipt)} settings={settings} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => window.print()} className="btn-ghost">
                <Printer size={15} /> Print
              </button>
              <button onClick={() => downloadBillPDF(advanceBookingToReceipt(generatedReceipt), settings)} className="btn-ghost">
                <Download size={15} /> Download PDF
              </button>
              <InvoiceWhatsAppButton bill={advanceBookingToReceipt(generatedReceipt)} settings={settings} kind="advance" />
              <button onClick={resetForm} className="btn-primary ml-auto">
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
