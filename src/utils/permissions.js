// Central role & permission definitions for the salon app.
//
// Three roles:
//   admin   - full access to everything, no restrictions.
//   manager - can do everything EXCEPT delete bills, delete expenses,
//             and change Settings.
//   staff   - limited to day-to-day front-desk work: create bills, enroll
//             memberships, send WhatsApp follow-ups, add services/products,
//             and view the dashboard. No access to Finance, Reports, Staff
//             management, or Settings, and cannot delete anything.
//
// A user's role is looked up by email against the `userRoles` list managed
// in Settings → Team & Roles (see AppContext.jsx). If that list is empty
// (brand-new setup), the signed-in user is treated as admin so someone can
// always get in to assign roles. If the list is non-empty but the signed-in
// email isn't in it, the safest default (least privilege) is used: staff.

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
}

export const ROLE_OPTIONS = [
  { value: ROLES.ADMIN, label: 'Admin', description: 'Full access to everything.' },
  {
    value: ROLES.MANAGER,
    label: 'Manager',
    description: 'Can do everything except delete bills/expenses or change Settings.',
  },
  {
    value: ROLES.STAFF,
    label: 'Staff',
    description: 'Create bills, enroll memberships, send follow-ups, add services/products, view dashboard.',
  },
]

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.STAFF]: 'Staff',
}

// Which top-level pages/routes each role may open at all. Admin always
// sees everything (handled in hasPageAccess below), so it's omitted here.
const PAGE_ACCESS = {
  dashboard: [ROLES.MANAGER, ROLES.STAFF],
  'new-bill': [ROLES.MANAGER, ROLES.STAFF],
  appointments: [ROLES.MANAGER, ROLES.STAFF],
  history: [ROLES.MANAGER, ROLES.STAFF],
  clients: [ROLES.MANAGER, ROLES.STAFF],
  memberships: [ROLES.MANAGER, ROLES.STAFF],
  staff: [ROLES.MANAGER],
  'follow-ups': [ROLES.MANAGER, ROLES.STAFF],
  reports: [ROLES.MANAGER],
  finance: [ROLES.MANAGER],
  services: [ROLES.MANAGER, ROLES.STAFF],
  products: [ROLES.MANAGER, ROLES.STAFF],
  settings: [],
}

// Fine-grained actions within a page each non-admin role may take.
const ACTION_ACCESS = {
  'bill.edit': [ROLES.MANAGER],
  'bill.delete': [],
  'expense.manage': [ROLES.MANAGER], // add/edit expenses
  'expense.delete': [],
  'service.delete': [ROLES.MANAGER],
  'product.delete': [ROLES.MANAGER],
  'staffMember.manage': [ROLES.MANAGER], // add/edit/delete staff members & attendance
  'client.delete': [ROLES.MANAGER],
  'membership.manage': [ROLES.MANAGER], // manage/delete plans & enrollments (enroll itself is separate, see below)
  'membership.enroll': [ROLES.MANAGER, ROLES.STAFF],
  'followUp.templates.manage': [ROLES.MANAGER],
  'settings.edit': [],
}

export function hasPageAccess(role, page) {
  if (role === ROLES.ADMIN) return true
  return (PAGE_ACCESS[page] || []).includes(role)
}

export function can(role, action) {
  if (role === ROLES.ADMIN) return true
  return (ACTION_ACCESS[action] || []).includes(role)
}
