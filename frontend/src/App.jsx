import { Navigate, Route, Routes } from 'react-router-dom'
import GuestOnly from './components/auth/GuestOnly'
import RequireAuth from './components/auth/RequireAuth'
import RequireRole from './components/auth/RequireRole'
import RootRedirect from './components/auth/RootRedirect'
import DashboardLayout from './components/layout/DashboardLayout'
import AdminDashboard from './pages/AdminDashboard'
import HotelDashboard from './pages/HotelDashboard'
import LoginPage from './pages/LoginPage'
import PoliceDashboard from './pages/PoliceDashboard'
import { ROUTES } from './utils/routes'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route
        path={ROUTES.login}
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />

      <Route
        path="/hotel"
        element={
          <RequireAuth>
            <RequireRole role="hotel">
              <DashboardLayout portal="hotel" />
            </RequireRole>
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<HotelDashboard />} />
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
        <Route path="dashboard" element={<PoliceDashboard />} />
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
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
