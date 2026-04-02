import './page.css'

export default function PoliceDashboard() {
  return (
    <div className="page">
      <div className="page__card">
        <h2 className="page__title">Police oversight</h2>
        <p className="page__text">
          Placeholder for nationwide blacklist management, alert triage, and cross-hotel
          visibility. Backend exposes{' '}
          <code className="page__code">/api/blacklist</code>,{' '}
          <code className="page__code">/api/alerts</code>, and hotel-scoped routes under{' '}
          <code className="page__code">/api/hotels/:hotelId/...</code>.
        </p>
        <ul className="page__list">
          <li>Role: <strong>police</strong> — can create/delete blacklist rows and review all alerts.</li>
          <li>Next: blacklist CRUD UI, alert inbox, filters by hotel.</li>
        </ul>
      </div>
    </div>
  )
}
