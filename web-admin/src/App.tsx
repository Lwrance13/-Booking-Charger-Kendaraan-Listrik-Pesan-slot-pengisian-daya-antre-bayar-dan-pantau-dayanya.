import { initAdminAuth } from './services/apiClient'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import StationsPage  from './pages/StationsPage'
import BookingsPage  from './pages/BookingsPage'
import SessionsPage  from './pages/SessionsPage'
import SlotsPage     from './pages/SlotsPage'
import PowerPage     from './pages/PowerPage'
import BillingPage   from './pages/BillingPage'
import TariffsPage   from './pages/TariffsPage'
import AuditPage     from './pages/AuditPage'

export default function App() {
  initAdminAuth()  // get admin JWT on first render
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/stations" replace />} />
        <Route element={<Layout><StationsPage /></Layout>}  path="/stations" />
        <Route element={<Layout><BookingsPage /></Layout>}  path="/bookings" />
        <Route element={<Layout><SessionsPage /></Layout>}  path="/sessions" />
        <Route element={<Layout><SlotsPage /></Layout>}     path="/slots" />
        <Route element={<Layout><PowerPage /></Layout>}     path="/power" />
        <Route element={<Layout><BillingPage /></Layout>}   path="/billing" />
        <Route element={<Layout><TariffsPage /></Layout>}   path="/tariffs" />
        <Route element={<Layout><AuditPage /></Layout>}     path="/audit" />
      </Routes>
    </BrowserRouter>
  )
}
