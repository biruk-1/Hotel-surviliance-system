import { useEffect, useState } from 'react'
import { Users, BedDouble, Bell, AlertCircle, UserCheck } from 'lucide-react'
import { useHotelScope } from '../../hooks/useHotelScope'
import { getHotelStats } from '../../services/hotelService'
import { listAlertsForHotel } from '../../services/alertService'
import { listGuests } from '../../services/guestService'
import { getApiErrorMessage } from '../../utils/apiError'
import { groupByDay } from '../../components/charts/chartUtils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import ChartCard from '../../components/charts/ChartCard'
import TrendAreaChart from '../../components/charts/TrendAreaChart'
import SimpleBarChart from '../../components/charts/SimpleBarChart'
import DonutPieChart from '../../components/charts/DonutPieChart'

function StatCard({ title, value, description, icon: Icon, loading, alert }) {
  return (
    <Card className={alert ? 'border-amber-200' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${alert ? 'text-amber-500' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className={`text-3xl font-bold ${alert ? 'text-amber-600' : ''}`}>{value ?? '—'}</p>
        )}
        {description && !loading && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

export default function HotelDashboardPage() {
  const { loading: scopeLoading, error: scopeError, hotels, selectedHotelId } = useHotelScope()
  const [stats, setStats] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [chartsLoading, setChartsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (scopeLoading || scopeError || hotels.length === 0 || !selectedHotelId) {
      setLoading(false)
      setChartsLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setError(null)
      setLoading(true)
      setChartsLoading(true)
      try {
        const [statsData, alertData, guestData] = await Promise.all([
          getHotelStats(selectedHotelId),
          listAlertsForHotel(selectedHotelId, { limit: 100 }),
          listGuests({ hotelId: selectedHotelId, limit: 100 }),
        ])
        if (cancelled) return
        setStats(statsData)
        setAlerts(alertData.data?.alerts ?? [])
        setGuests(guestData.data?.guests ?? [])
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) { setLoading(false); setChartsLoading(false) }
      }
    }
    load()
    return () => { cancelled = true }
  }, [scopeLoading, scopeError, hotels.length, selectedHotelId])

  /* ── Chart data ── */
  const alertTrend = groupByDay(alerts, 'created_at', 10)
  const checkinTrend = groupByDay(guests, 'checkIn', 10)

  const statusMap = {}
  for (const g of guests) {
    const s = g.status ?? 'unknown'
    statusMap[s] = (statusMap[s] || 0) + 1
  }
  const statusData = Object.entries(statusMap).map(([name, value]) => ({
    name: name === 'active' ? 'Active' : name === 'checked_out' ? 'Checked Out' : name === 'cancelled' ? 'Cancelled' : name,
    value,
  }))

  const dayCountMap = {}
  for (const g of guests) {
    const raw = g.checkIn
    if (!raw) continue
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) continue
    const day = d.toLocaleDateString('en-US', { weekday: 'short' })
    dayCountMap[day] = (dayCountMap[day] || 0) + 1
  }
  const weekdayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const weekdayData = weekdayOrder.map((d) => ({ day: d, count: dayCountMap[d] ?? 0 }))

  if (scopeLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-16" /></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (scopeError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{getApiErrorMessage(scopeError, 'Could not load properties')}</AlertDescription>
      </Alert>
    )
  }

  if (hotels.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No property is assigned to your account. Contact an administrator.</AlertDescription>
      </Alert>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{getApiErrorMessage(error, 'Could not load dashboard')}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Overview</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Current status for the selected property</p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Guests" value={stats?.totalGuests} icon={Users} loading={loading} />
        <StatCard title="Active Stays" value={stats?.activeStays} icon={BedDouble} loading={loading} />
        <StatCard title="Pending Alerts" value={stats?.pendingAlerts} description="Not yet reviewed"
          icon={Bell} loading={loading} alert={stats?.pendingAlerts > 0} />
        <StatCard title="Check-ins (100)" value={guests.length} description="Loaded for analysis"
          icon={UserCheck} loading={chartsLoading} />
      </div>

      {!loading && stats?.pendingAlerts > 0 && (
        <Alert variant="warning" className="border-amber-200 bg-amber-50">
          <Bell className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            There {stats.pendingAlerts === 1 ? 'is' : 'are'}{' '}
            <strong>{stats.pendingAlerts}</strong>{' '}
            pending alert{stats.pendingAlerts !== 1 ? 's' : ''} requiring review.
          </AlertDescription>
        </Alert>
      )}

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Check-ins — Last 10 Days"
          description="Daily guest arrivals at this property"
          loading={chartsLoading}
          empty={!chartsLoading && checkinTrend.every((d) => d.count === 0)}
          emptyText="No check-in data available"
          height={200}
          className="lg:col-span-2"
        >
          <TrendAreaChart data={checkinTrend} label="Check-ins" />
        </ChartCard>

        <ChartCard
          title="Guest Status"
          description="Current stay status distribution"
          loading={chartsLoading}
          empty={!chartsLoading && statusData.length === 0}
          emptyText="No guest data"
          height={200}
        >
          <DonutPieChart data={statusData} />
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Alerts Trend — Last 10 Days"
          description="Daily alert volume for this property"
          loading={chartsLoading}
          empty={!chartsLoading && alertTrend.every((d) => d.count === 0)}
          emptyText="No alerts recorded in this period"
          height={200}
        >
          <TrendAreaChart data={alertTrend} label="Alerts" color="#b45309" />
        </ChartCard>

        <ChartCard
          title="Check-ins by Day of Week"
          description="Busiest days based on all loaded guests"
          loading={chartsLoading}
          empty={!chartsLoading && weekdayData.every((d) => d.count === 0)}
          emptyText="No check-in data available"
          height={200}
        >
          <SimpleBarChart data={weekdayData} xKey="day" yKey="count" label="Check-ins" />
        </ChartCard>
      </div>
    </div>
  )
}
