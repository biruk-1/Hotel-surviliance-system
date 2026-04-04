import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Plus, Loader2, Building2, Users, Pencil, Trash2 } from 'lucide-react'
import {
  assignUserToHotel, createHotel, listAllHotels, listHotelUsers,
  updateHotel, deleteHotel,
} from '../../services/hotelService'
import { listUsers } from '../../services/adminService'
import { getApiErrorMessage } from '../../utils/apiError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose, DialogTrigger,
} from '@/components/ui/dialog'

const PHONE_RE = /^\+?[0-9()\-.\s]{7,20}$/

/* ── Create Hotel Dialog ── */
function CreateHotelDialog({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const validation = useMemo(() => {
    const next = {}
    if (name.trim().length < 2) next.name = 'Name must be at least 2 characters.'
    if (phone.trim() && !PHONE_RE.test(phone.trim())) next.phone = 'Invalid phone format.'
    return next
  }, [name, phone])

  const canCreate = !submitting && Object.keys(validation).length === 0

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canCreate) return
    setError(null)
    setSubmitting(true)
    try {
      const data = await createHotel({
        name: name.trim(), addressLine1: addressLine1.trim() || undefined,
        city: city.trim() || undefined, country: country.trim() || undefined,
        phone: phone.trim() || undefined,
      })
      onCreated?.(data.hotel)
      setName(''); setAddressLine1(''); setCity(''); setCountry(''); setPhone('')
      setOpen(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not create property'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shrink-0"><Plus className="h-4 w-4 mr-2" />New Property</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Property</DialogTitle>
          <DialogDescription>Register a new hotel property in the system.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-1.5">
            <Label htmlFor="ch-name">Hotel Name *</Label>
            <Input id="ch-name" value={name} onChange={(e) => setName(e.target.value)} required disabled={submitting} aria-invalid={Boolean(validation.name)} />
            {validation.name && <p className="text-xs text-destructive">{validation.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ch-addr">Address Line</Label>
            <Input id="ch-addr" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} disabled={submitting} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ch-city">City</Label>
              <Input id="ch-city" value={city} onChange={(e) => setCity(e.target.value)} disabled={submitting} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ch-country">Country</Label>
              <Input id="ch-country" value={country} onChange={(e) => setCountry(e.target.value)} disabled={submitting} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ch-phone">Phone</Label>
            <Input id="ch-phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={submitting} aria-invalid={Boolean(validation.phone)} />
            {validation.phone && <p className="text-xs text-destructive">{validation.phone}</p>}
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button type="button" variant="outline" disabled={submitting}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={!canCreate}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{submitting ? 'Creating…' : 'Create Property'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ── Edit Hotel Dialog ── */
function EditHotelDialog({ hotel, onUpdated }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(hotel.name ?? '')
  const [city, setCity] = useState(hotel.city ?? '')
  const [country, setCountry] = useState(hotel.country ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  function handleOpen(val) {
    setOpen(val)
    if (val) {
      setName(hotel.name ?? '')
      setCity(hotel.city ?? '')
      setCountry(hotel.country ?? '')
      setError(null)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (name.trim().length < 2) { setError('Name must be at least 2 characters.'); return }
    setError(null)
    setSubmitting(true)
    try {
      await updateHotel(hotel.id, {
        name: name.trim(),
        city: city.trim() || undefined,
        country: country.trim() || undefined,
      })
      onUpdated?.()
      setOpen(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not update property'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit hotel"><Pencil className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Property</DialogTitle>
          <DialogDescription>Update hotel details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-1.5">
            <Label htmlFor="eh-name">Hotel Name</Label>
            <Input id="eh-name" value={name} onChange={(e) => setName(e.target.value)} required disabled={submitting} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="eh-city">City</Label>
              <Input id="eh-city" value={city} onChange={(e) => setCity(e.target.value)} disabled={submitting} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eh-country">Country</Label>
              <Input id="eh-country" value={country} onChange={(e) => setCountry(e.target.value)} disabled={submitting} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button type="button" variant="outline" disabled={submitting}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{submitting ? 'Saving…' : 'Save Changes'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ── Delete Hotel Dialog ── */
function DeleteHotelDialog({ hotel, onDeleted }) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  async function handleDelete() {
    setError(null)
    setDeleting(true)
    try {
      await deleteHotel(hotel.id)
      onDeleted?.()
      setOpen(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete property'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50" aria-label="Delete hotel"><Trash2 className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Property</DialogTitle>
          <DialogDescription>This will remove the hotel from the system. This cannot be undone.</DialogDescription>
        </DialogHeader>
        <div className="rounded-md bg-muted/40 border border-border px-4 py-3 text-sm">
          <p className="font-medium">{hotel.name}</p>
          {hotel.city && <p className="text-muted-foreground text-xs mt-0.5">{hotel.city}{hotel.country ? `, ${hotel.country}` : ''}</p>}
        </div>
        {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        <DialogFooter className="gap-2">
          <DialogClose asChild><Button type="button" variant="outline" disabled={deleting}>Cancel</Button></DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{deleting ? 'Deleting…' : 'Delete Property'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Main Page ── */
export default function AdminHotelsPage() {
  const [hotels, setHotels] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState(null)
  const [hotelStaff, setHotelStaff] = useState([])
  const [selectedHotelId, setSelectedHotelId] = useState('')
  const [assignedUsers, setAssignedUsers] = useState([])
  const [assignUserId, setAssignUserId] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignError, setAssignError] = useState(null)

  const loadHotels = useCallback(async () => {
    setListError(null)
    setLoading(true)
    try {
      const data = await listAllHotels()
      setHotels(data.hotels ?? [])
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Could not load properties'))
      setHotels([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadHotels() }, [loadHotels])

  const loadStaffPool = useCallback(async () => {
    try {
      const data = await listUsers({ role: 'hotel' })
      setHotelStaff(data.users ?? [])
    } catch { setHotelStaff([]) }
  }, [])

  useEffect(() => { loadStaffPool() }, [loadStaffPool])

  const loadAssigned = useCallback(async (hotelId) => {
    if (!hotelId) { setAssignedUsers([]); return }
    setAssignLoading(true)
    setAssignError(null)
    try {
      const data = await listHotelUsers(hotelId)
      setAssignedUsers(data.users ?? [])
    } catch (err) {
      setAssignError(getApiErrorMessage(err, 'Could not load assignments'))
      setAssignedUsers([])
    } finally { setAssignLoading(false) }
  }, [])

  useEffect(() => {
    if (selectedHotelId) loadAssigned(selectedHotelId)
    else setAssignedUsers([])
  }, [selectedHotelId, loadAssigned])

  useEffect(() => {
    if (hotels.length && !selectedHotelId) setSelectedHotelId(hotels[0].id)
  }, [hotels, selectedHotelId])

  const assignedIds = useMemo(() => new Set(assignedUsers.map((u) => u.id)), [assignedUsers])
  const unassignedStaff = useMemo(() => hotelStaff.filter((u) => !assignedIds.has(u.id)), [hotelStaff, assignedIds])

  async function handleAssign(e) {
    e.preventDefault()
    setAssignError(null)
    if (!selectedHotelId || !assignUserId) { setAssignError('Select a property and a user.'); return }
    setAssignLoading(true)
    try {
      await assignUserToHotel(selectedHotelId, assignUserId)
      setAssignUserId('')
      await loadAssigned(selectedHotelId)
      await loadStaffPool()
    } catch (err) {
      setAssignError(getApiErrorMessage(err, 'Assignment failed'))
    } finally { setAssignLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Hotel Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Register, edit, and delete hotel properties</p>
        </div>
        <CreateHotelDialog onCreated={(h) => { loadHotels(); if (h?.id) setSelectedHotelId(h.id) }} />
      </div>

      {listError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {listError}
            <Button variant="link" size="sm" className="ml-2 h-auto p-0" onClick={loadHotels}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Hotels table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {loading ? 'Loading…' : `${hotels.length} propert${hotels.length === 1 ? 'y' : 'ies'} registered`}
            </CardTitle>
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>ID</TableHead>
              <TableHead className="w-[90px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [1, 2, 3].map((i) => (
                <TableRow key={i}>{[1,2,3,4,5].map((j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              ))
            ) : hotels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No properties yet. Click "New Property" to add one.
                </TableCell>
              </TableRow>
            ) : (
              hotels.map((h) => (
                <TableRow key={h.id} className={h.id === selectedHotelId ? 'bg-muted/40' : ''}>
                  <TableCell className="font-medium">{h.name}</TableCell>
                  <TableCell className="text-muted-foreground">{h.city ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{h.country ?? '—'}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted rounded px-1.5 py-0.5 text-muted-foreground" title={h.id}>
                      {h.id.slice(0, 8)}…
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      <EditHotelDialog hotel={h} onUpdated={loadHotels} />
                      <DeleteHotelDialog hotel={h} onDeleted={() => { loadHotels(); if (selectedHotelId === h.id) setSelectedHotelId('') }} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Separator />

      {/* Staff assignment */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Assign Staff</CardTitle>
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed">
            Only accounts with the{' '}
            <Badge variant="secondary" className="text-xs align-middle">hotel</Badge>{' '}
            role can be assigned.
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{assignError}</AlertDescription></Alert>}
          <div className="space-y-1.5">
            <Label htmlFor="assign-property">Property</Label>
            <Select value={selectedHotelId} onValueChange={setSelectedHotelId} disabled={!hotels.length || assignLoading}>
              <SelectTrigger id="assign-property" className="max-w-xs">
                <SelectValue placeholder="Select property…" />
              </SelectTrigger>
              <SelectContent>
                {hotels.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}{h.city ? ` — ${h.city}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Currently Assigned</Label>
            {assignLoading && selectedHotelId ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…</div>
            ) : assignedUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No staff assigned to this property yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {assignedUsers.map((u) => (
                  <Badge key={u.id} variant="secondary" className="gap-1 font-normal">
                    {u.fullName}<span className="text-muted-foreground">({u.email})</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <form onSubmit={handleAssign} className="flex items-end gap-3 pt-2">
            <div className="space-y-1.5 flex-1 max-w-xs">
              <Label htmlFor="assign-user">Add Hotel User</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId} disabled={!selectedHotelId || !unassignedStaff.length || assignLoading}>
                <SelectTrigger id="assign-user">
                  <SelectValue placeholder={!unassignedStaff.length ? 'No unassigned hotel users' : 'Select user…'} />
                </SelectTrigger>
                <SelectContent>
                  {unassignedStaff.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName} — {u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={!assignUserId || assignLoading || !selectedHotelId}>
              {assignLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {assignLoading ? 'Saving…' : 'Assign'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
