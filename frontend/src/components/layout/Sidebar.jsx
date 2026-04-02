import { NavLink } from 'react-router-dom'
import './sidebar.css'

const NAV = {
  hotel: {
    title: 'Hotel',
    badge: 'Staff',
    items: [{ to: '/hotel/dashboard', label: 'Dashboard' }],
  },
  police: {
    title: 'Police',
    badge: 'Ops',
    items: [{ to: '/police/dashboard', label: 'Dashboard' }],
  },
  admin: {
    title: 'Admin',
    badge: 'Sys',
    items: [{ to: '/admin/dashboard', label: 'Dashboard' }],
  },
}

export default function Sidebar({ portal }) {
  const config = NAV[portal]

  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="sidebar__brand">
        <span className="sidebar__logo" aria-hidden />
        <div>
          <div className="sidebar__title">Surveillance</div>
          <div className="sidebar__subtitle">{config.title}</div>
        </div>
        <span className="sidebar__badge">{config.badge}</span>
      </div>

      <nav className="sidebar__nav">
        {config.items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
            }
            end
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
