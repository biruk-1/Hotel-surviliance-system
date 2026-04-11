import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  AlertCircle,
  FileDown,
  Loader2,
  Printer,
  RefreshCw,
  Search,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  fetchGuestReport,
  fetchBlacklistReport,
  fetchAlertsReport,
  fetchCombinedReport,
} from '../../services/reportService'
import { listPoliceHotels } from '../../services/policeService'
import { getApiErrorMessage } from '../../utils/apiError'
import { formatDateTime } from '../../utils/hotel'
import {
  downloadGuestReportPdf,
  downloadBlacklistReportPdf,
  downloadAlertsReportPdf,
  downloadCombinedReportPdf,
} from '../../utils/reportPdf'
import logo from '@/assets/logo.png'
import GuestPreviewTable from '@/components/reports/GuestPreviewTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

const REPORT_TYPES = [
  { value: 'guests', label: 'Guest registrations (stays)' },
  { value: 'blacklist', label: 'Blacklist' },
  { value: 'alerts', label: 'Alerts' },
  { value: 'combined', label: 'Combined (guests + blacklist + alerts)' },
]

const STAY_STATUSES = [
  { value: '__any', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'checked_out', label: 'Checked out' },
  { value: 'cancelled', label: 'Cancelled' },
]

function buildParams(state) {
  const p = {}
  if (state.dateFrom) p.dateFrom = state.dateFrom
  if (state.dateTo) p.dateTo = state.dateTo
  if (state.limit) p.limit = Number(state.limit)
  if (state.hotelId && state.hotelId !== '__all') p.hotelId = state.hotelId
  if (state.stayStatus && state.stayStatus !== '__any') p.stayStatus = state.stayStatus
  if (state.hotelCountry?.trim()) p.hotelCountry = state.hotelCountry.trim()
  if (state.hotelCity?.trim()) p.hotelCity = state.hotelCity.trim()
  if (state.reasonContains?.trim()) p.reasonContains = state.reasonContains.trim()
  if (state.severity?.trim()) p.severity = state.severity.trim()
  if (state.titleContains?.trim()) p.titleContains = state.titleContains.trim()
  return p
}

function BlacklistPreviewTable({ rows }) {
  if (!rows?.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No rows for this query.</p>
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Added</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.full_name}</TableCell>
              <TableCell><code className="text-xs">{r.id_number}</code></TableCell>
              <TableCell className="text-sm">{r.phone ?? '—'}</TableCell>
              <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{r.reason ?? '—'}</TableCell>
              <TableCell className="text-xs whitespace-nowrap">{formatDateTime(r.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function AlertsPreviewTable({ rows }) {
  if (!rows?.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No rows for this query.</p>
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Severity</TableHead>
            <TableHead>Hotel</TableHead>
            <TableHead>Guest</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{r.severity}</TableCell>
              <TableCell className="text-sm">{r.hotel_name}</TableCell>
              <TableCell className="text-sm">{r.guest_full_name ?? '—'}</TableCell>
              <TableCell className="max-w-xs truncate text-sm">{r.title}</TableCell>
              <TableCell className="text-xs whitespace-nowrap">{formatDateTime(r.created_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default function ReportsPage() {
  const location = useLocation()
  const { user } = useAuth()
  const portalLabel = location.pathname.startsWith('/admin') ? 'Administration Portal' : 'Police Portal'

  const [hotels, setHotels] = useState([])
  const [hotelsLoading, setHotelsLoading] = useState(true)

  const [reportType, setReportType] = useState('guests')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [hotelId, setHotelId] = useState('__all')
  const [stayStatus, setStayStatus] = useState('__any')
  const [hotelCountry, setHotelCountry] = useState('')
  const [hotelCity, setHotelCity] = useState('')
  const [reasonContains, setReasonContains] = useState('')
  const [severity, setSeverity] = useState('')
  const [titleContains, setTitleContains] = useState('')
  const [limit, setLimit] = useState('500')
  const [officerRef, setOfficerRef] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [payload, setPayload] = useState(null)
  const [generatedLabel, setGeneratedLabel] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await listPoliceHotels()
        if (!cancelled) setHotels(data.hotels ?? [])
      } catch {
        if (!cancelled) setHotels([])
      } finally {
        if (!cancelled) setHotelsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const filterState = useMemo(() => ({
    dateFrom,
    dateTo,
    hotelId,
    stayStatus,
    hotelCountry,
    hotelCity,
    reasonContains,
    severity,
    titleContains,
    limit,
  }), [dateFrom, dateTo, hotelId, stayStatus, hotelCountry, hotelCity, reasonContains, severity, titleContains, limit])

  const runReport = useCallback(async () => {
    setError(null)
    setLoading(true)
    setPayload(null)
    try {
      const params = buildParams(filterState)
      let data
      if (reportType === 'guests') data = await fetchGuestReport(params)
      else if (reportType === 'blacklist') data = await fetchBlacklistReport(params)
      else if (reportType === 'alerts') data = await fetchAlertsReport(params)
      else data = await fetchCombinedReport(params)
      setPayload(data)
      setGeneratedLabel(formatDateTime(new Date().toISOString()))
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [reportType, filterState])

  function handlePrint() {
    window.print()
  }

  function handlePdf() {
    if (!payload) return
    const opts = { officer: officerRef.trim() || undefined, portalLabel }
    if (payload.type === 'guests') {
      downloadGuestReportPdf(payload.rows, payload.meta, opts)
    } else if (payload.type === 'blacklist') {
      downloadBlacklistReportPdf(payload.rows, payload.meta, opts)
    } else if (payload.type === 'alerts') {
      downloadAlertsReportPdf(payload.rows, payload.meta, opts)
    } else if (payload.type === 'combined') {
      downloadCombinedReportPdf(payload, opts)
    }
  }

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h2 className="text-xl font-semibold">Reports</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Generate printable and PDF exports from guest registrations, blacklist, and alerts. “Guests” refers to registered hotel guests, not staff accounts.
        </p>
      </div>

      <Card className="no-print">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Set a date range and optional filters, then generate a preview. Large exports are capped server-side (max 5,000 rows per section).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Report type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-from">Date from</Label>
              <Input id="r-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-to">Date to</Label>
              <Input id="r-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Property (hotel)</Label>
              <Select value={hotelId} onValueChange={setHotelId} disabled={hotelsLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={hotelsLoading ? 'Loading…' : 'All properties'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All properties</SelectItem>
                  {hotels.map((h) => (
                    <SelectItem key={h.id} value={h.id}>{h.name}{h.city ? ` — ${h.city}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(reportType === 'guests' || reportType === 'combined') && (
              <>
                <div className="space-y-2">
                  <Label>Stay status</Label>
                  <Select value={stayStatus} onValueChange={setStayStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAY_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-city">Hotel city (contains)</Label>
                  <Input id="r-city" value={hotelCity} onChange={(e) => setHotelCity(e.target.value)} placeholder="Filter by city" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="r-country">Hotel country (contains)</Label>
                  <Input id="r-country" value={hotelCountry} onChange={(e) => setHotelCountry(e.target.value)} placeholder="Filter by country" />
                </div>
              </>
            )}
            {(reportType === 'blacklist' || reportType === 'combined') && (
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="r-reason">Blacklist reason (contains)</Label>
                <Input id="r-reason" value={reasonContains} onChange={(e) => setReasonContains(e.target.value)} placeholder="Optional text match" />
              </div>
            )}
            {(reportType === 'alerts' || reportType === 'combined') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="r-sev">Alert severity (exact)</Label>
                  <Input id="r-sev" value={severity} onChange={(e) => setSeverity(e.target.value)} placeholder="e.g. info, warning, high" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="r-title">Alert title / message (contains)</Label>
                  <Input id="r-title" value={titleContains} onChange={(e) => setTitleContains(e.target.value)} />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="r-limit">Row limit</Label>
              <Input id="r-limit" type="number" min={1} max={5000} value={limit} onChange={(e) => setLimit(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="r-officer">Officer name or ID (shown on print / PDF only)</Label>
              <Input id="r-officer" value={officerRef} onChange={(e) => setOfficerRef(e.target.value)} placeholder="Optional" autoComplete="off" />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{getApiErrorMessage(error, 'Could not load report')}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" onClick={runReport} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Generate report
            </Button>
            <Button type="button" variant="outline" onClick={runReport} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card id="report-print-root" className="print:border-0 print:shadow-none">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between space-y-0">
          <div className="flex gap-4">
            <img src={logo} alt="" className="h-14 w-14 shrink-0 rounded-md border bg-white object-contain p-1 print:h-16 print:w-16" />
            <div>
              <CardTitle className="text-lg print:text-xl">Hotel Surveillance — Operational report</CardTitle>
              <CardDescription className="text-foreground/90">
                {portalLabel} · {user?.full_name ?? user?.email ?? 'Authorized user'}
              </CardDescription>
              <p className="text-xs text-muted-foreground mt-1">
                {generatedLabel ? `Generated ${generatedLabel}` : 'Not generated yet'}
                {officerRef.trim() ? (
                  <> · Officer / reference: {officerRef.trim()}</>
                ) : null}
              </p>
            </div>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handlePrint} disabled={!payload}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button type="button" size="sm" onClick={handlePdf} disabled={!payload}>
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {!payload && !loading && (
            <p className="text-sm text-muted-foreground text-center py-12">
              Configure filters and click “Generate report” to preview data here.
            </p>
          )}
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {payload?.type === 'guests' && (
            <section>
              <h3 className="text-sm font-semibold mb-2">Guest registrations & stays ({payload.meta?.count ?? payload.rows?.length ?? 0} rows)</h3>
              <GuestPreviewTable rows={payload.rows} />
            </section>
          )}

          {payload?.type === 'blacklist' && (
            <section>
              <h3 className="text-sm font-semibold mb-2">Blacklist ({payload.meta?.count ?? payload.rows?.length ?? 0} rows)</h3>
              <BlacklistPreviewTable rows={payload.rows} />
            </section>
          )}

          {payload?.type === 'alerts' && (
            <section>
              <h3 className="text-sm font-semibold mb-2">Alerts ({payload.meta?.count ?? payload.rows?.length ?? 0} rows)</h3>
              <AlertsPreviewTable rows={payload.rows} />
            </section>
          )}

          {payload?.type === 'combined' && (
            <>
              <section>
                <h3 className="text-sm font-semibold mb-2">A. Guest registrations ({payload.guests?.rows?.length ?? 0})</h3>
                <GuestPreviewTable rows={payload.guests?.rows} />
              </section>
              <section>
                <h3 className="text-sm font-semibold mb-2">B. Blacklist ({payload.blacklist?.rows?.length ?? 0})</h3>
                <BlacklistPreviewTable rows={payload.blacklist?.rows} />
              </section>
              <section>
                <h3 className="text-sm font-semibold mb-2">C. Alerts ({payload.alerts?.rows?.length ?? 0})</h3>
                <AlertsPreviewTable rows={payload.alerts?.rows} />
              </section>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
