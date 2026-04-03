import { Link } from 'react-router-dom'
import { ROUTES } from '../utils/routes'
import './page.css'

export default function AdminDashboard() {
  return (
    <div className="page">
      <div className="page__card">
        <h2 className="page__title">System administration</h2>
        <p className="page__text">
          Manage properties and operator accounts. Only users with the <strong>admin</strong> role
          can access this portal.
        </p>
        <ul className="page__list">
          <li>
            <Link className="page__link" to={ROUTES.admin.hotels}>
              Hotel management
            </Link>{' '}
            — register properties and assign hotel staff.
          </li>
          <li>
            <Link className="page__link" to={ROUTES.admin.users}>
              User management
            </Link>{' '}
            — create accounts for hotel, police, and admin roles.
          </li>
        </ul>
      </div>
    </div>
  )
}
