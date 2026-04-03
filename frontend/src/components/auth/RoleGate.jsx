import { useAuth } from '../../hooks/useAuth'

const VALID_ROLES = ['hotel', 'police', 'admin']

/**
 * Renders `children` only when the authenticated user has one of the specified roles.
 * Renders `fallback` (default `null`) otherwise — never throws.
 *
 * Use this for in-page conditional rendering; for route-level protection use RequireRole.
 *
 * @param {{
 *   roles: string | string[];
 *   fallback?: React.ReactNode;
 *   children: React.ReactNode;
 * }} props
 */
export default function RoleGate({ roles, fallback = null, children }) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) return fallback

  const allowed = (Array.isArray(roles) ? roles : [roles]).filter((r) =>
    VALID_ROLES.includes(r),
  )

  if (!allowed.includes(user.role)) return fallback

  return children
}
