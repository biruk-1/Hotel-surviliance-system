import './page.css'

export default function AdminDashboard() {
  return (
    <div className="page">
      <div className="page__card">
        <h2 className="page__title">System administration</h2>
        <p className="page__text">
          Placeholder for org-wide configuration, user lifecycle, and audit views. The API
          uses JWT roles; <strong>admin</strong> can reach the same read surfaces as police
          for alerts and blacklist with broader operational expectations.
        </p>
        <ul className="page__list">
          <li>Role: <strong>admin</strong> — use for cross-cutting tools and governance.</li>
          <li>Next: user admin screens, hotel registry, operational dashboards.</li>
        </ul>
      </div>
    </div>
  )
}
