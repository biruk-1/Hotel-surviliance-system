import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getDashboardPathForRole, ROUTES } from '../../utils/routes'

const VALID_ROLES = ['hotel', 'police', 'admin']

export default function RequireRole({ role, children }) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return <Navigate to={ROUTES.login} replace />
  }

  if (!VALID_ROLES.includes(user.role) || user.role !== role) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />
  }

  return children
}
