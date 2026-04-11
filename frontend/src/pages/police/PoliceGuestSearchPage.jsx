import { useCallback, useEffect, useState } from 'react'
import { Search, AlertCircle, Eye } from 'lucide-react'
import { listGuests, getGuestById } from '../../services/guestService'
import { listPoliceHotels } from '../../services/policeService'
import { getApiErrorMessage } from '../../utils/apiError'
import { formatDateTime } from '../../utils/hotel'
import { formatStayStatus, primaryStayDisplay } from '../../utils/policeUi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const PAGE_SIZE = 15

function guestName(g) {
  return g.full_name ?? g.fullName ?? '—'
}

function guestDob(g) {
  const d = g.date_of_birth ?? g.dateOfBirth
  if (!d) return '—'
  if (typeof d === 'string' && d.length >= 10) return d.slice(0, 10)
  return String(d)
}

function guestPhone(g) {
  const p = g.phone ?? g.phoneNumber
  return p != null && String(p).trim() !== '' ? String(p) : '—'
}

export default function PoliceGuestSearchPage() {
  const [name, setName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [hotelId, setHotelId] = useState('')
  const [hotels, setHotels] = useState([])
  const [hotelsLoadError, setHotelsLoadError] = useState(null)
  const [page, setPage] = useState(1)
  const [guests, setGuests] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailGuest, setDetailGuest] = useState(null)
  const [detailStays, setDetailStays] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function loadHotels() {
      try {
        const data = await listPoliceHotels()
        if (!cancelled) setHotels(data.hotels ?? [])
      } catch (e) {
        if (!cancelled) setHotelsLoadError(getApiErrorMessage(e, 'Could not load property list'))
      }
    }
    loadHotels()
    return () => { cancelled = true }
  }, [])

  const runSearch = useCallback(
    async (pageNum) => {
      setError(null)
      setLoading(true)
      try {
        const params = { page: pageNum, limit: PAGE_SIZE }
        const n = name.trim()
        const id = idNumber.trim()
        if (n) params.name = n
        if (id) params.idNumber = id
        if (hotelId) params.hotelId = hotelId

        const { data, pagination: pag } = await listGuests(params)
        setGuests(data?.guests ?? [])
        setPagination(pag ?? null)
        setPage(pageNum)
      } catch (e) {
        setError(e)
        setGuests([])
        setPagination(null)
      } finally {
        setLoading(false)
        setHasSearched(true)
      }
    },
    [name, idNumber, hotelId],
  )

  function handleSubmit(e) {
    e.preventDefault()
    runSearch(1)
  }

  async function openGuestDetail(guestId) {
    setDetailOpen(true)
    setDetailGuest(null)
    setDetailStays([])
    setDetailError(null)
    setDetailLoading(true)
    try {
      const data = await getGuestById(guestId)
      setDetailGuest(data.guest ?? null)
      setDetailStays(data.stays ?? [])
    } catch (e) {
      setDetailError(getApiErrorMessage(e, 'Could not load guest'))
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Search Guests</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Query guests across all hotel properties — location is shown for the current primary stay (active first, then most recent check-in).
        </p>
      </div>

      {hotelsLoadError && (
        <Alert variant="warning" className="border-amber-200 bg-amber-50">
          <AlertDescription className="text-amber-900">{hotelsLoadError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <div className="text-sm text-muted-foreground leading-relaxed">
            All fields are optional — leave blank to retrieve all guests (paged).
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="s-name">Name contains</Label>
                <Input
                  id="s-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-id">ID number contains</Label>
                <Input
                  id="s-id"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-hotel">Property</Label>
                <Select value={hotelId || '__all'} onValueChange={(v) => setHotelId(v === '__all' ? '' : v)}>
                  <SelectTrigger id="s-hotel">
                    <SelectValue placeholder="All properties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All properties</SelectItem>
                    {hotels.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}{h.city ? ` — ${h.city}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <>Searching…</>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getApiErrorMessage(error, 'Search failed')}</AlertDescription>
        </Alert>
      )}

      {!hasSearched && !loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Set optional filters and click Search to find guests.
        </p>
      ) : null}

      {hasSearched && (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>ID number</TableHead>
                  <TableHead>Date of birth</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="min-w-[140px]">Hotel</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Checkout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[88px] text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : guests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No guests match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  guests.map((g) => {
                    const loc = primaryStayDisplay(g)
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{guestName(g)}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted rounded px-1.5 py-0.5">
                            {g.id_number ?? g.idNumber ?? '—'}
                          </code>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {guestDob(g)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {guestPhone(g)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              loc.hotelLabel === 'No active stay'
                                ? 'text-muted-foreground text-sm'
                                : 'font-semibold text-foreground text-sm'
                            }
                          >
                            {loc.hotelLabel}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{loc.room}</TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {loc.checkIn}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {loc.checkOut}
                        </TableCell>
                        <TableCell>
                          {loc.status === '—' ? (
                            <span className="text-muted-foreground text-sm">—</span>
                          ) : (
                            <Badge variant={loc.status === 'Active' ? 'secondary' : 'outline'} className="font-normal">
                              {loc.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => openGuestDetail(g.id)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
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
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={!pagination.hasPrev || loading} onClick={() => runSearch(page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={!pagination.hasNext || loading} onClick={() => runSearch(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Guest record</DialogTitle>
            <DialogDescription>
              All stays linked to this guest (newest check-in first).
            </DialogDescription>
          </DialogHeader>
          {detailLoading && (
            <div className="space-y-2 py-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
          {detailError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{detailError}</AlertDescription>
            </Alert>
          )}
          {!detailLoading && !detailError && detailGuest && (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm space-y-1">
                <p className="font-semibold text-base">{detailGuest.full_name ?? detailGuest.fullName}</p>
                <p className="text-muted-foreground">
                  ID: <code className="text-xs bg-muted rounded px-1">{detailGuest.id_number ?? detailGuest.idNumber}</code>
                  {' · '}
                  DOB: {guestDob(detailGuest)}
                </p>
                <p className="text-muted-foreground">
                  Phone: {guestPhone(detailGuest)}
                  {detailStays[0] && (detailStays[0].check_out ?? detailStays[0].checkOut) ? (
                    <>
                      {' · '}
                      Planned checkout:{' '}
                      {formatDateTime(detailStays[0].check_out ?? detailStays[0].checkOut)}
                    </>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground font-mono">{detailGuest.id}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Stay history</h4>
                {detailStays.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No stays on record.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hotel</TableHead>
                        <TableHead>Room</TableHead>
                        <TableHead>Check-in</TableHead>
                        <TableHead>Check-out</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailStays.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">
                            {s.hotel_name ?? s.hotelName ?? 'Unknown'}
                          </TableCell>
                          <TableCell>{s.room_number ?? s.roomNumber ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {formatDateTime(s.check_in ?? s.checkIn)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                            {(s.check_out ?? s.checkOut)
                              ? formatDateTime(s.check_out ?? s.checkOut)
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal">
                              {formatStayStatus(s.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
