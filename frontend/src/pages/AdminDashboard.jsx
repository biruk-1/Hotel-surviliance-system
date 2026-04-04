import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, UserCog, Users, Bell, ArrowRight, AlertCircle,
} from 'lucide-react'
import { ROUTES } from '../utils/routes'
import { listUsers } from '../services/adminService'
import { listAllHotels } from '../services/hotelService'
import { listAlerts } from '../services/alertService'
import { getApiErrorMessage } from '../utils/apiError'
import { groupByDay } from '../components/charts/chartUtils'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import ChartCard from '../components/charts/ChartCard'
import TrendAreaChart from '../components/charts/TrendAreaChart'
import SimpleBarChart from '../components/charts/SimpleBarChart'
import DonutPieChart from '../components/charts/DonutPieChart'

/* ── Stat card ── */
function StatCard({ title, value, icon: Icon, loading, link, linkLabel }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-3xl font-bold">{value ?? '—'}</p>
        )}
        {link && !loading && (
          <Button asChild variant="link" size="sm" className="mt-1 h-auto p-0 text-xs text-muted-foreground">
            <Link to={link}>{linkLabel} <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [hotels, setHotels] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [uData, hData, aData] = await Promise.all([
          listUsers(),
          listAllHotels(),
          listAlerts({ limit: 100 }),
        ])
        if (cancelled) return
        setUsers(uData.users ?? [])
        setHotels(hData.hotels ?? [])
        setAlerts(aData.data?.alerts ?? [])
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  /* ── Derived chart data ── */
  const roleData = [
    { name: 'Hotel', value: users.filter((u) => u.role === 'hotel').length },
    { name: 'Police', value: users.filter((u) => u.role === 'police').length },
    { name: 'Admin', value: users.filter((u) => u.role === 'admin').length },
  ]

  const hotelBarData = hotels.slice(0, 8).map((h) => ({
    name: h.name.length > 14 ? h.name.slice(0, 13) + '…' : h.name,
    users: 0,
  }))

  const alertTrend = groupByDay(alerts, 'created_at', 10)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">System Overview</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Real-time statistics across all properties and accounts
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getApiErrorMessage(error, 'Could not load dashboard data')}</AlertDescription>
        </Alert>
      )}

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Hotels" value={hotels.length} icon={Building2} loading={loading}
          link={ROUTES.admin.hotels} linkLabel="Manage hotels" />
        <StatCard title="Total Users" value={users.length} icon={UserCog} loading={loading}
          link={ROUTES.admin.users} linkLabel="Manage users" />
        <StatCard title="Hotel Staff" value={users.filter((u) => u.role === 'hotel').length}
          icon={Users} loading={loading} />
        <StatCard title="Recent Alerts" value={alerts.length} icon={Bell} loading={loading} />
      </div>

      {/* ── Charts row ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Users by Role"
          description="Distribution of accounts across roles"
          loading={loading}
          empty={!loading && users.length === 0}
          height={220}
        >
          <DonutPieChart data={roleData} />
        </ChartCard>

        <ChartCard
          title="Registered Hotels"
          description="Properties in the system"
          loading={loading}
          empty={!loading && hotels.length === 0}
          emptyText="No hotels registered yet"
          height={220}
        >
          <SimpleBarChart
            data={hotelBarData}
            xKey="name"
            yKey="users"
            label="Staff"
          />
        </ChartCard>

        <ChartCard
          title="Alerts — Last 10 Days"
          description="Daily alert volume across all properties"
          loading={loading}
          empty={!loading && alertTrend.every((d) => d.count === 0)}
          emptyText="No alerts in the last 10 days"
          height={220}
        >
          <TrendAreaChart data={alertTrend} label="Alerts" />
        </ChartCard>
      </div>

      {/* ── Quick links ── */}
      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl">
        <Card className="hover:border-primary/30 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-sm">Hotel Management</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to={ROUTES.admin.hotels}>Open <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/30 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                <UserCog className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-sm">User Management</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to={ROUTES.admin.users}>Open <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
