import { useCallback, useEffect, useState } from 'react'
import { Users, Bell, ShieldAlert, AlertCircle, CalendarDays } from 'lucide-react'
import RealtimeAlertToast from '../../components/alerts/RealtimeAlertToast'
import { useNewAlertSocket } from '../../hooks/useNewAlertSocket'
import { getPoliceDashboardStats } from '../../services/policeService'
import { listAlerts } from '../../services/alertService'
import { listBlacklist } from '../../services/blacklistService'
import { getApiErrorMessage } from '../../utils/apiError'
import { groupByDay } from '../../components/charts/chartUtils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import ChartCard from '../../components/charts/ChartCard'
import TrendAreaChart from '../../components/charts/TrendAreaChart'
import DonutPieChart from '../../components/charts/DonutPieChart'
import SimpleBarChart from '../../components/charts/SimpleBarChart'

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

export default function PoliceDashboardPage() {
  const [stats, setStats] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [blacklist, setBlacklist] = useState([])
  const [loading, setLoading] = useState(true)
  const [chartsLoading, setChartsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  async function loadStats(opts = {}) {
    const { quiet = false } = opts
    if (!quiet) setLoading(true)
    setError(null)
    try {
      const data = await getPoliceDashboardStats()
      setStats(data)
    } catch (e) {
      if (!quiet) setError(e)
    } finally {
      if (!quiet) setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      setLoading(true)
      setChartsLoading(true)
      setError(null)
      try {
        const [statsData, alertData, blData] = await Promise.all([
          getPoliceDashboardStats(),
          listAlerts({ limit: 100 }),
          listBlacklist({ limit: 100 }),
        ])
        if (cancelled) return
        setStats(statsData)
        setAlerts(alertData.data?.alerts ?? [])
        setBlacklist(blData.data?.entries ?? blData.data ?? [])
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) { setLoading(false); setChartsLoading(false) }
      }
    }
    loadAll()
    return () => { cancelled = true }
  }, [])

  const refreshStatsQuiet = useCallback(() => loadStats({ quiet: true }), [])

  useNewAlertSocket({
    enabled: true,
    onNewAlert: (alert) => {
      setToast({
        title: typeof alert.title === 'string' ? alert.title : 'New alert',
        message: typeof alert.message === 'string' ? alert.message : undefined,
      })
      refreshStatsQuiet()
    },
  })

  const dismissToast = useCallback(() => setToast(null), [])

  /* ── Chart data ── */
  const alertTrend = groupByDay(alerts, 'created_at', 10)
  const blacklistTrend = groupByDay(blacklist, 'created_at', 10)

  // Severity distribution
  const severityMap = {}
  for (const a of alerts) {
    const s = a.severity ?? 'unknown'
    severityMap[s] = (severityMap[s] || 0) + 1
  }
  const severityData = Object.entries(severityMap).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))

  // Hotel alert distribution (top 6)
  const hotelMap = {}
  for (const a of alerts) {
    const name = a.hotel_name ?? a.hotelName ?? a.hotel?.name ?? 'Unknown'
    hotelMap[name] = (hotelMap[name] || 0) + 1
  }
  const hotelAlertData = Object.entries(hotelMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name: name.length > 12 ? name.slice(0, 11) + '…' : name, count }))

  return (
    <div className="space-y-6">
      <RealtimeAlertToast toast={toast} onDismiss={dismissToast} />

      <div>
        <h2 className="text-xl font-semibold">Police Overview</h2>
        <p className="text-sm text-muted-foreground mt-0.5">System-wide statistics across all properties</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getApiErrorMessage(error, 'Could not load dashboard')}</AlertDescription>
        </Alert>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Guests" value={stats?.totalGuests} icon={Users} loading={loading} />
        <StatCard title="Alerts Today" value={stats?.alertsToday} description="Server local day"
          icon={Bell} loading={loading} alert={stats?.alertsToday > 0} />
        <StatCard title="Blacklist Entries" value={stats?.blacklistCount} icon={ShieldAlert} loading={loading} />
        <StatCard title="Recent Alerts (100)" value={alerts.length} description="Loaded for analysis"
          icon={CalendarDays} loading={chartsLoading} />
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Alerts — Last 10 Days"
          description="Daily volume across all hotels"
          loading={chartsLoading}
          empty={!chartsLoading && alertTrend.every((d) => d.count === 0)}
          emptyText="No alerts recorded in this period"
          height={200}
          className="lg:col-span-2"
        >
          <TrendAreaChart data={alertTrend} label="Alerts" />
        </ChartCard>

        <ChartCard
          title="Alert Severity"
          description="Distribution by severity level"
          loading={chartsLoading}
          empty={!chartsLoading && severityData.length === 0}
          emptyText="No alert data"
          height={200}
        >
          <DonutPieChart data={severityData} />
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Alerts by Hotel"
          description="Top properties by alert count"
          loading={chartsLoading}
          empty={!chartsLoading && hotelAlertData.length === 0}
          emptyText="No hotel data available"
          height={200}
        >
          <SimpleBarChart data={hotelAlertData} xKey="name" yKey="count" label="Alerts" />
        </ChartCard>

        <ChartCard
          title="Blacklist Entries — Last 10 Days"
          description="New entries added over time"
          loading={chartsLoading}
          empty={!chartsLoading && blacklistTrend.every((d) => d.count === 0)}
          emptyText="No new entries in this period"
          height={200}
        >
          <TrendAreaChart data={blacklistTrend} label="New Entries" color="#475569" />
        </ChartCard>
      </div>
    </div>
  )
}
