import './page.css'

export default function HotelDashboard() {
  return (
    <div className="page">
      <div className="page__card">
        <h2 className="page__title">Hotel operations</h2>
        <p className="page__text">
          Placeholder for check-ins, guest registry, stays, documents, and hotel-scoped
          alerts. Backend endpoints are under{' '}
          <code className="page__code">/api/guests</code>,{' '}
          <code className="page__code">/api/stays</code>,{' '}
          <code className="page__code">/api/alerts</code>, and{' '}
          <code className="page__code">/api/documents</code>.
        </p>
        <ul className="page__list">
          <li>Role: <strong>hotel</strong> — access limited to assigned properties via hotel_users.</li>
          <li>Next: list guests, create stay, upload ID documents, acknowledge alerts.</li>
        </ul>
      </div>
    </div>
  )
}
