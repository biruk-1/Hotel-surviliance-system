export const ROUTES = {
  login: '/login',
  hotel: {
    root: '/hotel',
    dashboard: '/hotel/dashboard',
    reports: '/hotel/reports',
  },
  police: {
    root: '/police',
    dashboard: '/police/dashboard',
    reports: '/police/reports',
  },
  admin: {
    root: '/admin',
    dashboard: '/admin/dashboard',
    hotels: '/admin/hotels',
    users: '/admin/users',
    reports: '/admin/reports',
  },
}

/** @param {'hotel' | 'police' | 'admin' | string | undefined} role */
export function getDashboardPathForRole(role) {
  switch (role) {
    case 'hotel':
      return ROUTES.hotel.dashboard
    case 'police':
      return ROUTES.police.dashboard
    case 'admin':
      return ROUTES.admin.dashboard
    default:
      return ROUTES.login
  }
}

/**
 * After login, return a prior protected URL only if it matches the user's portal.
 * @param {'hotel' | 'police' | 'admin'} role
 * @param {string | undefined} fromPathname
 */
export function getPostLoginPath(role, fromPathname) {
  if (
    typeof fromPathname === 'string' &&
    fromPathname.startsWith('/') &&
    !fromPathname.startsWith(ROUTES.login)
  ) {
    if (role === 'hotel' && fromPathname.startsWith(ROUTES.hotel.root)) return fromPathname
    if (role === 'police' && fromPathname.startsWith(ROUTES.police.root)) return fromPathname
    if (role === 'admin' && fromPathname.startsWith(ROUTES.admin.root)) return fromPathname
  }
  return getDashboardPathForRole(role)
}
