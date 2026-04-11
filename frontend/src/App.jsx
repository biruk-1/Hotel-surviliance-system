import { Navigate, Route, Routes } from 'react-router-dom'
import GuestOnly from './components/auth/GuestOnly'
import HotelPropertyBar from './components/hotel/HotelPropertyBar'
import RequireAuth from './components/auth/RequireAuth'
import RequireRole from './components/auth/RequireRole'
import RootRedirect from './components/auth/RootRedirect'
import { HotelScopeProvider } from './context/HotelScopeProvider'
import DashboardLayout from './components/layout/DashboardLayout'
import PublicLayout from './components/layout/PublicLayout'
import AdminDashboard from './pages/AdminDashboard'
import AdminHotelsPage from './pages/admin/AdminHotelsPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import GuestListPage from './pages/hotel/GuestListPage'
import HotelAlertsPage from './pages/hotel/HotelAlertsPage'
import HotelDashboardPage from './pages/hotel/HotelDashboardPage'
import RegisterGuestPage from './pages/hotel/RegisterGuestPage'
import HotelGuestReportPage from './pages/hotel/HotelGuestReportPage'
import LoginPage from './pages/LoginPage'
import PoliceAlertsPage from './pages/police/PoliceAlertsPage'
import PoliceBlacklistPage from './pages/police/PoliceBlacklistPage'
import PoliceDashboardPage from './pages/police/PoliceDashboardPage'
import PoliceGuestSearchPage from './pages/police/PoliceGuestSearchPage'
import ReportsPage from './pages/reports/ReportsPage'
import { ROUTES } from './utils/routes'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route
        path={ROUTES.login}
        element={
          <PublicLayout>
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          </PublicLayout>
        }
      />

      <Route
        path="/hotel"
        element={
          <RequireAuth>
            <RequireRole role="hotel">
              <HotelScopeProvider>
                <DashboardLayout portal="hotel" topSlot={<HotelPropertyBar />} />
              </HotelScopeProvider>
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<HotelDashboardPage />} />
        <Route path="guests/register" element={<RegisterGuestPage />} />
        <Route path="guests" element={<GuestListPage />} />
        <Route path="reports" element={<HotelGuestReportPage />} />
        <Route path="alerts" element={<HotelAlertsPage />} />
      </Route>

      <Route
        path="/police"
        element={
          <RequireAuth>
            <RequireRole role="police">
              <DashboardLayout portal="police" />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PoliceDashboardPage />} />
        <Route path="guests" element={<PoliceGuestSearchPage />} />
        <Route path="alerts" element={<PoliceAlertsPage />} />
        <Route path="blacklist" element={<PoliceBlacklistPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireAuth>
            <RequireRole role="admin">
              <DashboardLayout portal="admin" />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="hotels" element={<AdminHotelsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="alerts" element={<PoliceAlertsPage />} />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
