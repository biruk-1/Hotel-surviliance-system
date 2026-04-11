import { Outlet } from 'react-router-dom'
import { UnreadAlertsProvider } from '@/context/UnreadAlertsContext'
import Header from './Header'
import Sidebar from './Sidebar'
import AppFooter from './AppFooter'

export default function DashboardLayout({ portal, topSlot = null }) {
  return (
    <UnreadAlertsProvider portal={portal}>
    {/* h-screen + min-h-0: lock shell to viewport so only <main> scrolls; sidebar stays fixed */}
    <div className="flex h-screen min-h-0 overflow-hidden bg-background print:h-auto print:min-h-0 print:overflow-visible">
      <Sidebar portal={portal} className="print:hidden" />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden print:overflow-visible">
        <Header portal={portal} className="print:hidden" />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain print:overflow-visible">
          {topSlot}
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:px-6 print:py-4">
            <Outlet />
          </div>
        </main>
        <AppFooter className="print:hidden" />
      </div>
    </div>
    </UnreadAlertsProvider>
  )
}
