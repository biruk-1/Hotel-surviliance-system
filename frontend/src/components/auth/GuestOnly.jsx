import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getDashboardPathForRole } from '../../utils/routes'

export default function GuestOnly({ children }) {
  const { isAuthenticated, user } = useAuth()

  if (isAuthenticated && user) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />
  }

  return children
}
