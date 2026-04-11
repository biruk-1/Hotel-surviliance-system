import { formatDateTime } from '../../utils/hotel'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

export default function GuestPreviewTable({ rows }) {
  if (!rows?.length) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No rows for this query.</p>
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Guest</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Hotel</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Room</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Checkout</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.stay_id ?? `${r.guest_id}-${r.check_in}`}>
              <TableCell className="font-medium whitespace-nowrap">{r.full_name}</TableCell>
              <TableCell><code className="text-xs">{r.id_number}</code></TableCell>
              <TableCell className="text-sm">{r.phone ?? '—'}</TableCell>
              <TableCell className="text-sm">{r.hotel_name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {[r.hotel_city, r.hotel_country].filter(Boolean).join(', ') || '—'}
              </TableCell>
              <TableCell>{r.room_number ?? '—'}</TableCell>
              <TableCell className="text-xs whitespace-nowrap">{formatDateTime(r.check_in)}</TableCell>
              <TableCell className="text-xs whitespace-nowrap">{r.check_out ? formatDateTime(r.check_out) : '—'}</TableCell>
              <TableCell className="text-xs">{r.stay_status}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
