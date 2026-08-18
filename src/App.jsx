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
import Services from './pages/Services.jsx'
import Products from './pages/Products.jsx'
import Memberships from './pages/Memberships.jsx'
import Settings from './pages/Settings.jsx'

function ProtectedRoute({ children }) {
  const { isAuthed } = useApp()
  if (!isAuthed) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { isAuthed } = useApp()

  return (
    <Routes>
      <Route path="/login" element={isAuthed ? <Navigate to="/" replace /> : <Login />} />
      {/* Public, no-login invoice link - e.g. /invoice/INV-0001 */}
      <Route path="/invoice/:billNo" element={<PublicInvoice />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/new-bill" element={<NewBill />} />
                <Route path="/history" element={<BillingHistory />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/clients/:id" element={<ClientProfile />} />
                <Route path="/staff" element={<Staff />} />
                <Route path="/follow-ups" element={<FollowUps />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/services" element={<Services />} />
                <Route path="/products" element={<Products />} />
                <Route path="/memberships" element={<Memberships />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
