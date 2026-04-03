import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/routes'

const TITLES = {
  '/hotel/dashboard': 'Hotel dashboard',
  '/hotel/guests/register': 'Register guest',
  '/hotel/guests': 'Guests',
  '/hotel/alerts': 'Alerts',
  '/police/dashboard': 'Police dashboard',
  '/police/guests': 'Search guests',
  '/police/alerts': 'Alerts',
  '/police/blacklist': 'Blacklist',
  '/admin/dashboard': 'Admin dashboard',
}

export default function Header({ portal }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const heading = TITLES[location.pathname] ?? 'Dashboard'

  function handleLogout() {
    logout()
    navigate(ROUTES.login, { replace: true })
  }

  return (
    <header className="app-header">
      <div className="app-header__titles">
        <h1 className="app-header__heading">{heading}</h1>
        <p className="app-header__meta">
          {portal === 'hotel' && 'Guest stays, alerts, and hotel operations'}
          {portal === 'police' && 'Blacklist, alerts, and cross-hotel visibility'}
          {portal === 'admin' && 'System-wide oversight and configuration'}
        </p>
      </div>
      <div className="app-header__actions">
        <div className="app-header__user" title={user?.email ?? ''}>
          <span className="app-header__avatar" aria-hidden />
          <div className="app-header__user-text">
            <span className="app-header__name">{user?.fullName ?? '—'}</span>
            <span className="app-header__role">{user?.role ?? '—'}</span>
          </div>
        </div>
        <button type="button" className="app-header__logout" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </header>
  )
}
