import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Info, Plus, Loader2, Trash2 } from 'lucide-react'
import {
  createBlacklistEntry,
  listBlacklist,
  removeBlacklistEntry,
} from '../../services/blacklistService'
import { getApiErrorMessage } from '../../utils/apiError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

const PAGE_SIZE = 20

function formatDateAdded(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return String(iso)
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return String(iso) }
}

function formatDob(value) {
  if (!value) return '—'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  return String(value)
}

export default function PoliceBlacklistPage() {
  const [page, setPage] = useState(1)
  const [entries, setEntries] = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [formName, setFormName] = useState('')
  const [formIdNumber, setFormIdNumber] = useState('')
  const [formDob, setFormDob] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formCheckout, setFormCheckout] = useState('')
  const [formReason, setFormReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [formSuccess, setFormSuccess] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadList = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const { data, pagination: pag } = await listBlacklist({ page, limit: PAGE_SIZE })
      setEntries(data?.entries ?? [])
      setPagination(pag ?? null)
    } catch (e) {
      setError(e)
      setEntries([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { loadList() }, [loadList])

  async function handleCreate(e) {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    setSubmitting(true)
    try {
      await createBlacklistEntry({
        name: formName.trim(),
        idNumber: formIdNumber.trim(),
        dateOfBirth: formDob,
        phone: formPhone.trim() || undefined,
        checkoutDate: formCheckout || undefined,
        reason: formReason.trim() || undefined,
      })
      setFormSuccess('Entry added to blacklist.')
      setFormName('')
      setFormIdNumber('')
      setFormDob('')
      setFormPhone('')
      setFormCheckout('')
      setFormReason('')
      setDialogOpen(false)
      await loadList()
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not create entry'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(row) {
    const id = row.id
    if (!id) return
    if (!window.confirm('Remove this blacklist entry?')) return
    setDeletingId(id)
    try {
      await removeBlacklistEntry(String(id))
      await loadList()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Blacklist Registry</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Entries apply across all hotels — guest registrations are checked automatically
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Blacklist Entry</DialogTitle>
              <DialogDescription>
                This entry will be checked against all hotel guest registrations.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {formError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bl-name">Full Name <span className="text-destructive">*</span></Label>
                  <Input id="bl-name" value={formName} onChange={(e) => setFormName(e.target.value)} required disabled={submitting} autoComplete="name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bl-id">ID Number <span className="text-destructive">*</span></Label>
                  <Input id="bl-id" value={formIdNumber} onChange={(e) => setFormIdNumber(e.target.value)} required disabled={submitting} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bl-dob">Date of Birth <span className="text-destructive">*</span></Label>
                  <Input id="bl-dob" type="date" value={formDob} onChange={(e) => setFormDob(e.target.value)} required disabled={submitting} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bl-phone">Phone <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="bl-phone" type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} disabled={submitting} autoComplete="tel" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bl-checkout">Planned checkout <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="bl-checkout" type="date" value={formCheckout} onChange={(e) => setFormCheckout(e.target.value)} disabled={submitting} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="bl-reason">Reason <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input id="bl-reason" value={formReason} onChange={(e) => setFormReason(e.target.value)} disabled={submitting} />
                </div>
              </div>

              <DialogFooter className="gap-2 mt-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={submitting}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitting ? 'Saving…' : 'Add to blacklist'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800">Global scope</AlertTitle>
        <AlertDescription className="text-blue-700">
          Blacklist entries apply across all hotels. Guest registrations are checked against this list automatically.
        </AlertDescription>
      </Alert>

      {formSuccess && (
        <Alert variant="success" className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{formSuccess}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{getApiErrorMessage(error, 'Could not load blacklist')}</AlertDescription>
        </Alert>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>ID Number</TableHead>
              <TableHead>Date of Birth</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Planned checkout</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [1, 2, 3].map((i) => (
                <TableRow key={i}>
                  {[1,2,3,4,5,6,7,8].map((j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No blacklist entries yet.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.full_name ?? row.fullName ?? row.name ?? '—'}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted rounded px-1.5 py-0.5">
                      {row.id_number ?? row.idNumber ?? '—'}
                    </code>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDob(row.date_of_birth ?? row.dateOfBirth)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {row.phone != null && String(row.phone).trim() !== '' ? row.phone : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {formatDob(row.checkout_date ?? row.checkoutDate)}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate text-muted-foreground text-sm">
                    {row.reason ?? '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {formatDateAdded(row.created_at)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={deletingId === row.id}
                      onClick={() => handleDelete(row)}
                      aria-label="Delete entry"
                    >
                      {deletingId === row.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
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
