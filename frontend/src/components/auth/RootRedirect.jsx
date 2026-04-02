import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getDashboardPathForRole, ROUTES } from '../../utils/routes'

export default function RootRedirect() {
  const { isAuthenticated, user } = useAuth()

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />
  }

  return <Navigate to={ROUTES.login} replace />
}
