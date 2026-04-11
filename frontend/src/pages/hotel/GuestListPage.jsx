import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Search, AlertCircle } from 'lucide-react'
import { useHotelScope } from '../../hooks/useHotelScope'
import { getGuestById, listGuests } from '../../services/guestService'
import { getApiErrorMessage } from '../../utils/apiError'
import { formatDateTime, pickStayForHotel } from '../../utils/hotel'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const PAGE_SIZE = 10

export default function GuestListPage() {
  const { loading: scopeLoading, error: scopeError, hotels, selectedHotelId } = useHotelScope()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
        const { data, pagination: pag } = await listGuests({ hotelId: selectedHotelId, page, limit: PAGE_SIZE })
        const guests = data?.guests ?? []
        const enriched = await Promise.all(
          guests.map(async (g) => {
            const detail = await getGuestById(g.id)
            const stays = detail.stays ?? []
            const stay = pickStayForHotel(stays, selectedHotelId)
            return {
              id: g.id,
              name: g.full_name ?? g.fullName ?? '—',
              idNumber: g.id_number ?? g.idNumber ?? '—',
              phone: detail.guest?.phone ?? g.phone ?? '—',
              room: stay?.room_number ?? stay?.roomNumber ?? '—',
              checkIn: stay?.check_in ?? stay?.checkIn,
              checkOut: stay?.check_out ?? stay?.checkOut ?? g.primary_check_out ?? g.primaryCheckOut,
            }
          }),
        )
        if (cancelled) return
        setRows(enriched)
        setPagination(pag ?? null)
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [scopeLoading, scopeError, hotels.length, selectedHotelId, page])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.idNumber.toLowerCase().includes(q) ||
        String(r.phone).toLowerCase().includes(q) ||
        String(r.id).toLowerCase().includes(q),
    )
  }, [rows, search])

  if (scopeLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
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
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Guest List</h2>
        <p className="text-sm text-muted-foreground mt-0.5">All registered guests for the selected property</p>
      </div>

      {/* Search toolbar */}
      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID…"
            className="pl-9"
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getApiErrorMessage(error, 'Could not load guests')}</AlertDescription>
        </Alert>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ID Number</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Checkout</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No guests match this view.
                </TableCell>
              </TableRow>
            ) : (
              filteredRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted rounded px-1.5 py-0.5">{r.idNumber}</code>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{r.phone}</TableCell>
                  <TableCell>{r.room}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDateTime(r.checkIn)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDateTime(r.checkOut)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {pagination && search.trim() === '' && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
