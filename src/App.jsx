import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './context/AppContext.jsx'
import Login from './components/Login.jsx'
import PublicInvoice from './pages/PublicInvoice.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NewBill from './pages/NewBill.jsx'
import BillingHistory from './pages/BillingHistory.jsx'
import Clients from './pages/Clients.jsx'
import ClientProfile from './pages/ClientProfile.jsx'
import Staff from './pages/Staff.jsx'
import FollowUps from './pages/FollowUps.jsx'
import Reports from './pages/Reports.jsx'
import Finance from './pages/Finance.jsx'
import Services from './pages/Services.jsx'
import Products from './pages/Products.jsx'
import Memberships from './pages/Memberships.jsx'
import Appointments from './pages/Appointments.jsx'
import Settings from './pages/Settings.jsx'
import { hasPageAccess } from './utils/permissions.js'
import { ShieldAlert } from 'lucide-react'

// A blank cream screen for the brief moment while supabase.auth checks for
// an existing session on load - avoids flashing the login page for someone
// who's already signed in.
function AuthGate() {
  return <div className="min-h-screen w-full bg-cream" />
}

function ProtectedRoute({ children }) {
  const { isAuthed, authLoading } = useApp()
  if (authLoading) return <AuthGate />
  if (!isAuthed) return <Navigate to="/login" replace />
  return children
}

// Second layer of defense beyond hiding nav links: even if someone types a
// restricted URL directly (e.g. /settings as a staff account), this blocks
// the page itself based on their role.
function RoleRoute({ page, children }) {
  const { role } = useApp()
  if (!hasPageAccess(role, page)) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center card p-8">
        <ShieldAlert size={28} className="mx-auto text-danger mb-3" />
        <p className="font-display text-xl text-ink mb-1">Access restricted</p>
        <p className="text-sm text-muted">Your role doesn't have permission to view this page.</p>
      </div>
    )
  }
  return children
}

export default function App() {
  const { isAuthed, authLoading } = useApp()

  return (
    <Routes>
      <Route path="/login" element={authLoading ? <AuthGate /> : isAuthed ? <Navigate to="/" replace /> : <Login />} />
      {/* Public, no-login invoice link - e.g. /invoice/INV-0001 */}
      <Route path="/invoice/:billNo" element={<PublicInvoice />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<RoleRoute page="dashboard"><Dashboard /></RoleRoute>} />
                <Route path="/new-bill" element={<RoleRoute page="new-bill"><NewBill /></RoleRoute>} />
                <Route path="/appointments" element={<RoleRoute page="appointments"><Appointments /></RoleRoute>} />
                <Route path="/history" element={<RoleRoute page="history"><BillingHistory /></RoleRoute>} />
                <Route path="/clients" element={<RoleRoute page="clients"><Clients /></RoleRoute>} />
                <Route path="/clients/:id" element={<RoleRoute page="clients"><ClientProfile /></RoleRoute>} />
                <Route path="/staff" element={<RoleRoute page="staff"><Staff /></RoleRoute>} />
                <Route path="/follow-ups" element={<RoleRoute page="follow-ups"><FollowUps /></RoleRoute>} />
                <Route path="/reports" element={<RoleRoute page="reports"><Reports /></RoleRoute>} />
                <Route path="/finance" element={<RoleRoute page="finance"><Finance /></RoleRoute>} />
                <Route path="/services" element={<RoleRoute page="services"><Services /></RoleRoute>} />
                <Route path="/products" element={<RoleRoute page="products"><Products /></RoleRoute>} />
                <Route path="/memberships" element={<RoleRoute page="memberships"><Memberships /></RoleRoute>} />
                <Route path="/settings" element={<RoleRoute page="settings"><Settings /></RoleRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
