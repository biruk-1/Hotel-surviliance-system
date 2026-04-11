import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  FileDown,
  Loader2,
  Printer,
  RefreshCw,
  Search,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useHotelScope } from '../../hooks/useHotelScope'
import { fetchGuestReport } from '../../services/reportService'
import { getApiErrorMessage } from '../../utils/apiError'
import { formatDateTime } from '../../utils/hotel'
import { downloadGuestReportPdf } from '../../utils/reportPdf'
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
import { Skeleton } from '@/components/ui/skeleton'

const STAY_STATUSES = [
  { value: '__any', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'checked_out', label: 'Checked out' },
  { value: 'cancelled', label: 'Cancelled' },
]

function buildGuestParams(state) {
  const p = {}
  if (state.dateFrom) p.dateFrom = state.dateFrom
  if (state.dateTo) p.dateTo = state.dateTo
  if (state.limit) p.limit = Number(state.limit)
  if (state.hotelId && state.hotelId !== '__all') p.hotelId = state.hotelId
  if (state.stayStatus && state.stayStatus !== '__any') p.stayStatus = state.stayStatus
  if (state.hotelCountry?.trim()) p.hotelCountry = state.hotelCountry.trim()
  if (state.hotelCity?.trim()) p.hotelCity = state.hotelCity.trim()
  return p
}

export default function HotelGuestReportPage() {
  const { user } = useAuth()
  const {
    loading: scopeLoading,
    error: scopeError,
    hotels,
    selectedHotelId,
  } = useHotelScope()

  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [hotelId, setHotelId] = useState('__all')
  const [stayStatus, setStayStatus] = useState('__any')
  const [hotelCountry, setHotelCountry] = useState('')
  const [hotelCity, setHotelCity] = useState('')
  const [limit, setLimit] = useState('500')
  const [officerRef, setOfficerRef] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [payload, setPayload] = useState(null)
  const [generatedLabel, setGeneratedLabel] = useState('')

  useEffect(() => {
    if (selectedHotelId) setHotelId(selectedHotelId)
  }, [selectedHotelId])

  const filterState = useMemo(() => ({
    dateFrom,
    dateTo,
    hotelId,
    stayStatus,
    hotelCountry,
    hotelCity,
    limit,
  }), [dateFrom, dateTo, hotelId, stayStatus, hotelCountry, hotelCity, limit])

  const runReport = useCallback(async () => {
    setError(null)
    setLoading(true)
    setPayload(null)
    try {
      const params = buildGuestParams(filterState)
      const data = await fetchGuestReport(params)
      setPayload(data)
      setGeneratedLabel(formatDateTime(new Date().toISOString()))
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }, [filterState])

  function handlePrint() {
    window.print()
  }

  function handlePdf() {
    if (!payload) return
    downloadGuestReportPdf(payload.rows, payload.meta, {
      officer: officerRef.trim() || undefined,
      portalLabel: 'Hotel Portal',
    })
  }

  if (scopeLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
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

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h2 className="text-xl font-semibold">Guest list report</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Filter and print guest registrations and stays for your assigned properties only. Data is limited to hotels you are allowed to access.
        </p>
      </div>

      <Card className="no-print">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Optional date range and property filter, then generate a preview before printing or exporting to PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="hf-from">Date from</Label>
              <Input id="hf-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hf-to">Date to</Label>
              <Input id="hf-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={hotelId} onValueChange={setHotelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All my properties</SelectItem>
                  {hotels.map((h) => (
                    <SelectItem key={h.id} value={h.id}>{h.name}{h.city ? ` — ${h.city}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <Label htmlFor="hf-city">Hotel city (contains)</Label>
              <Input id="hf-city" value={hotelCity} onChange={(e) => setHotelCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hf-country">Hotel country (contains)</Label>
              <Input id="hf-country" value={hotelCountry} onChange={(e) => setHotelCountry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hf-limit">Row limit</Label>
              <Input id="hf-limit" type="number" min={1} max={5000} value={limit} onChange={(e) => setLimit(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="hf-officer">Staff reference (print / PDF only)</Label>
              <Input id="hf-officer" value={officerRef} onChange={(e) => setOfficerRef(e.target.value)} placeholder="Optional" autoComplete="off" />
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
              <CardTitle className="text-lg print:text-xl">Guest list — printable report</CardTitle>
              <CardDescription className="text-foreground/90">
                Hotel Portal · {user?.full_name ?? user?.email ?? 'Staff'}
              </CardDescription>
              <p className="text-xs text-muted-foreground mt-1">
                {generatedLabel ? `Generated ${generatedLabel}` : 'Not generated yet'}
                {officerRef.trim() ? (
                  <> · Reference: {officerRef.trim()}</>
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
        <CardContent>
          {!payload && !loading && (
            <p className="text-sm text-muted-foreground text-center py-12">
              Set filters and click “Generate report” to preview guests for your properties.
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
              <h3 className="text-sm font-semibold mb-2">
                Guest registrations & stays ({payload.meta?.count ?? payload.rows?.length ?? 0} rows)
              </h3>
              <GuestPreviewTable rows={payload.rows} />
            </section>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
