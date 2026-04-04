import { Outlet } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

export default function DashboardLayout({ portal, topSlot = null }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar portal={portal} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header portal={portal} />
        <main className="flex-1 overflow-auto">
          {topSlot}
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
