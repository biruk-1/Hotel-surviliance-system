import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getDashboardPathForRole } from '../../utils/routes'

/**
 * @param {{ role: 'hotel' | 'police' | 'admin'; children: import('react').ReactNode }} props
 */
export default function RequireRole({ role, children }) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return null
  }

  if (user.role !== role) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />
  }

  return children
}
