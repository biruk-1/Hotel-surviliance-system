export const ROUTES = {
  login: '/login',
  hotel: {
    root: '/hotel',
    dashboard: '/hotel/dashboard',
  },
  police: {
    root: '/police',
    dashboard: '/police/dashboard',
  },
  admin: {
    root: '/admin',
    dashboard: '/admin/dashboard',
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
