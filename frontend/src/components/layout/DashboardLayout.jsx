import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'
import './header.css'
import './layout.css'

export default function DashboardLayout({ portal, topSlot = null }) {
  return (
    <div className="app-shell">
      <div className="app-shell__sidebar">
        <Sidebar portal={portal} />
      </div>
      <div className="app-shell__header">
        <Header portal={portal} />
      </div>
      <main className="app-shell__main">
        {topSlot}
        <Outlet />
      </main>
    </div>
  )
}
