import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react'
import { listAlerts, markAlertReviewed } from '../../services/alertService'
import { getApiErrorMessage } from '../../utils/apiError'
import { formatDateTime } from '../../utils/hotel'
import { parseAlertDetailFields } from '../../utils/policeUi'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const PAGE_SIZE = 20

function SeverityBadge({ severity }) {
  const s = (severity ?? '').toLowerCase()
  if (s === 'critical') return <Badge variant="destructive">Critical</Badge>
  if (s === 'high') return <Badge className="bg-red-50 text-red-700 border-red-200">High</Badge>
  if (s === 'medium') return <Badge variant="warning">Medium</Badge>
  if (s === 'low') return <Badge variant="secondary">Low</Badge>
  return <Badge variant="outline">{severity ?? '—'}</Badge>
}

export default function PoliceAlertsPage() {
  const [page, setPage] = useState(1)
  const [alerts, setAlerts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionId, setActionId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [listVersion, setListVersion] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setError(null)
      setLoading(true)
      try {
        const { data, pagination: pag } = await listAlerts({ page, limit: PAGE_SIZE })
        if (cancelled) return
        setAlerts(data?.alerts ?? [])
        setPagination(pag ?? null)
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [page, listVersion])

  const refreshList = useCallback(() => setListVersion((v) => v + 1), [])

  async function handleReview(alertId) {
    setActionError(null)
    setActionId(alertId)
    try {
      const payload = await markAlertReviewed(alertId)
      const next = payload?.alert
      if (next) setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, ...next } : a)))
    } catch (e) {
      setActionError(getApiErrorMessage(e, 'Could not update alert'))
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Alerts</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          All alerts across properties — hotel and guest location are shown on every row.
        </p>
      </div>

      {actionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {getApiErrorMessage(error, 'Could not load alerts')}
            <Button variant="link" size="sm" className="ml-2 h-auto p-0" onClick={refreshList}>
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px] whitespace-nowrap">Hotel</TableHead>
              <TableHead className="min-w-[100px]">Guest</TableHead>
              <TableHead className="whitespace-nowrap">Room</TableHead>
              <TableHead className="whitespace-nowrap">Stay check-in</TableHead>
              <TableHead className="whitespace-nowrap">Match</TableHead>
              <TableHead className="min-w-[160px]">Reason / details</TableHead>
              <TableHead className="whitespace-nowrap">Alert time</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [1, 2, 3].map((i) => (
                <TableRow key={i}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full min-w-[4rem]" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : alerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No alerts.
                </TableCell>
              </TableRow>
            ) : (
              alerts.map((a) => {
                const reviewed = Boolean(a.acknowledged_at)
                const hotelName = a.hotel_name ?? a.hotelName ?? 'Unknown'
                const guestName = a.guest_full_name ?? a.guestFullName ?? '—'
                const room = a.stay_room_number ?? a.stayRoomNumber ?? '—'
                const stayIn = a.stay_check_in ?? a.stayCheckIn
                const parsed = parseAlertDetailFields(a.message)
                const matchDisplay = parsed.matchPercent ? `${parsed.matchPercent}%` : '—'
                const reasonDisplay = parsed.reason
                  ?? parsed.blacklistLine
                  ?? (a.message && !parsed.matchPercent ? a.message : null)
                  ?? '—'

                return (
                  <TableRow key={a.id}>
                    <TableCell className="align-top">
                      <span className="font-semibold text-foreground text-sm leading-snug block">
                        {hotelName}
                      </span>
                      <code className="text-[10px] text-muted-foreground font-mono mt-0.5 block" title={a.hotel_id}>
                        {(a.hotel_id ?? '').slice(0, 8)}…
                      </code>
                    </TableCell>
                    <TableCell className="align-top text-sm font-medium">
                      {guestName}
                    </TableCell>
                    <TableCell className="align-top text-sm text-muted-foreground whitespace-nowrap">
                      {room}
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground text-sm whitespace-nowrap">
                      {stayIn ? formatDateTime(stayIn) : '—'}
                    </TableCell>
                    <TableCell className="align-top whitespace-nowrap">
                      {matchDisplay !== '—' ? (
                        <Badge variant="secondary" className="tabular-nums font-semibold">
                          {matchDisplay}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top max-w-[220px]">
                      <p
                        className="text-sm text-muted-foreground line-clamp-3 leading-snug"
                        title={typeof a.message === 'string' ? a.message : ''}
                      >
                        {reasonDisplay}
                      </p>
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground text-sm whitespace-nowrap">
                      {formatDateTime(a.created_at)}
                    </TableCell>
                    <TableCell className="align-top"><SeverityBadge severity={a.severity} /></TableCell>
                    <TableCell className="align-top">
                      {reviewed ? (
                        <Badge variant="secondary">Reviewed</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={reviewed || actionId === a.id}
                        onClick={() => handleReview(a.id)}
                      >
                        {actionId === a.id && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                        {actionId === a.id ? 'Saving…' : reviewed ? 'Done' : 'Mark reviewed'}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {pagination && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
