import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react'
import RealtimeAlertToast from '../../components/alerts/RealtimeAlertToast'
import { useNewAlertSocket } from '../../hooks/useNewAlertSocket'
import { useHotelScope } from '../../hooks/useHotelScope'
import { listAlertsForHotel, markAlertReviewed } from '../../services/alertService'
import { getApiErrorMessage } from '../../utils/apiError'
import { formatDateTime } from '../../utils/hotel'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const PAGE_SIZE = 15

function SeverityBadge({ severity }) {
  const s = (severity ?? '').toLowerCase()
  if (s === 'critical') return <Badge variant="destructive">Critical</Badge>
  if (s === 'high') return <Badge className="bg-red-50 text-red-700 border-red-200">High</Badge>
  if (s === 'medium') return <Badge variant="warning">Medium</Badge>
  if (s === 'low') return <Badge variant="secondary">Low</Badge>
  return <Badge variant="outline">{severity ?? '—'}</Badge>
}

export default function HotelAlertsPage() {
  const { loading: scopeLoading, error: scopeError, hotels, selectedHotelId } = useHotelScope()
  const selectedHotelIdRef = useRef(selectedHotelId)
  selectedHotelIdRef.current = selectedHotelId

  const [page, setPage] = useState(1)
  const [listVersion, setListVersion] = useState(0)
  const [alerts, setAlerts] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionId, setActionId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [toast, setToast] = useState(null)

  useLayoutEffect(() => { setPage(1) }, [selectedHotelId])

  useEffect(() => {
    if (scopeLoading || scopeError || hotels.length === 0 || !selectedHotelId) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function load() {
      setError(null)
      setLoading(true)
      try {
        const { data, pagination: pag } = await listAlertsForHotel(selectedHotelId, { page, limit: PAGE_SIZE })
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
  }, [scopeLoading, scopeError, hotels.length, selectedHotelId, page, listVersion])

  const refreshList = useCallback(() => setListVersion((v) => v + 1), [])

  useNewAlertSocket({
    enabled: Boolean(!scopeLoading && !scopeError && hotels.length > 0 && selectedHotelId),
    onNewAlert: (alert) => {
      setToast({
        title: typeof alert.title === 'string' ? alert.title : 'New alert',
        message: typeof alert.message === 'string' ? alert.message : undefined,
      })
      const hid = alert.hotel_id
      if (hid && selectedHotelIdRef.current && hid === selectedHotelIdRef.current) {
        setPage(1)
        setListVersion((v) => v + 1)
      }
    },
  })

  const dismissToast = useCallback(() => setToast(null), [])

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

  if (scopeLoading || (hotels.length === 0 && !scopeLoading && !scopeError)) {
    return (
      <>
        <RealtimeAlertToast toast={toast} onDismiss={dismissToast} />
        {hotels.length === 0 && !scopeLoading ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No property is assigned to your account.</AlertDescription>
          </Alert>
        ) : (
          <Card><div className="p-6 space-y-3">{[1,2,3].map(i=><Skeleton key={i} className="h-10 w-full"/>)}</div></Card>
        )}
      </>
    )
  }

  if (scopeError) {
    return (
      <>
        <RealtimeAlertToast toast={toast} onDismiss={dismissToast} />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getApiErrorMessage(scopeError, 'Could not load properties')}</AlertDescription>
        </Alert>
      </>
    )
  }

  return (
    <div className="space-y-4">
      <RealtimeAlertToast toast={toast} onDismiss={dismissToast} />

      <div>
        <h2 className="text-xl font-semibold">Alerts</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Alerts for the selected property only</p>
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

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [1, 2, 3].map((i) => (
                <TableRow key={i}>
                  {[1,2,3,4,5,6].map((j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : alerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No alerts for this property.
                </TableCell>
              </TableRow>
            ) : (
              alerts.map((a) => {
                const reviewed = Boolean(a.acknowledged_at)
                return (
                  <TableRow key={a.id}>
                    <TableCell><SeverityBadge severity={a.severity} /></TableCell>
                    <TableCell className="font-medium">{a.title ?? '—'}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                      {a.message ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {formatDateTime(a.created_at)}
                    </TableCell>
                    <TableCell>
                      {reviewed ? (
                        <Badge variant="secondary">Reviewed</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
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
