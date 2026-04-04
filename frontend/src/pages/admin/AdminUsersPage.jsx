import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Plus, Loader2, Check, X, Pencil, Trash2, KeyRound } from 'lucide-react'
import { createUser, listUsers, updateUser, updateUserPassword, deleteUser } from '../../services/adminService'
import { getApiErrorMessage } from '../../utils/apiError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose, DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const ROLES = [
  { value: 'hotel', label: 'Hotel staff' },
  { value: 'police', label: 'Police' },
  { value: 'admin', label: 'Administrator' },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function RoleBadge({ role }) {
  if (role === 'admin') return <Badge variant="default">{role}</Badge>
  if (role === 'police') return <Badge variant="info">{role}</Badge>
  return <Badge variant="secondary">{role}</Badge>
}

function PasswordCheck({ pass, label }) {
  return (
    <li className={cn('flex items-center gap-1.5 text-xs', pass ? 'text-emerald-700' : 'text-muted-foreground')}>
      {pass ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </li>
  )
}

/* ── Create User Dialog ── */
function CreateUserDialog({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('hotel')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)
  const [formSuccess, setFormSuccess] = useState(null)

  const passwordChecks = useMemo(() => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
  }), [password])

  const validation = useMemo(() => {
    const next = {}
    if (fullName.trim().length < 2) next.fullName = 'At least 2 characters.'
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email.'
    if (!Object.values(passwordChecks).every(Boolean)) next.password = 'Password does not meet requirements.'
    return next
  }, [email, fullName, passwordChecks])

  const canSubmit = !submitting && Object.keys(validation).length === 0

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const data = await createUser({ email: email.trim(), password, fullName: fullName.trim(), role })
      setFormSuccess(`Account created for ${data.user?.email ?? email}.`)
      setEmail(''); setPassword(''); setFullName(''); setRole('hotel')
      onCreated?.()
      setTimeout(() => { setOpen(false); setFormSuccess(null) }, 1200)
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'Could not create user'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shrink-0"><Plus className="h-4 w-4 mr-2" />New User</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>Create an operator account and assign a role.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}
          {formSuccess && <Alert variant="success" className="border-emerald-200 bg-emerald-50"><AlertDescription className="text-emerald-800">{formSuccess}</AlertDescription></Alert>}

          <div className="space-y-1.5">
            <Label htmlFor="cu-name">Full Name *</Label>
            <Input id="cu-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={submitting} autoComplete="name" aria-invalid={Boolean(validation.fullName)} />
            {validation.fullName && <p className="text-xs text-destructive">{validation.fullName}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email *</Label>
            <Input id="cu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={submitting} autoComplete="off" aria-invalid={Boolean(validation.email)} />
            {validation.email && <p className="text-xs text-destructive">{validation.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-pass">Initial Password *</Label>
            <Input id="cu-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={submitting} autoComplete="new-password" minLength={8} />
            <ul className="space-y-0.5 mt-1.5">
              <PasswordCheck pass={passwordChecks.length} label="At least 8 characters" />
              <PasswordCheck pass={passwordChecks.upper} label="One uppercase letter" />
              <PasswordCheck pass={passwordChecks.lower} label="One lowercase letter" />
              <PasswordCheck pass={passwordChecks.digit} label="One digit" />
            </ul>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-role">Role *</Label>
            <Select value={role} onValueChange={setRole} disabled={submitting}>
              <SelectTrigger id="cu-role"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button type="button" variant="outline" disabled={submitting}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={!canSubmit}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{submitting ? 'Creating…' : 'Create User'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ── Edit User Dialog ── */
function EditUserDialog({ user, onUpdated }) {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState(user.fullName ?? '')
  const [role, setRole] = useState(user.role ?? 'hotel')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  function handleOpen(val) {
    setOpen(val)
    if (val) { setFullName(user.fullName ?? ''); setRole(user.role ?? 'hotel'); setError(null) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (fullName.trim().length < 2) { setError('Name must be at least 2 characters.'); return }
    setError(null)
    setSubmitting(true)
    try {
      await updateUser(user.id, { fullName: fullName.trim(), role })
      onUpdated?.()
      setOpen(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not update user'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit user"><Pencil className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription className="truncate text-xs">{user.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-1.5">
            <Label htmlFor="eu-name">Full Name</Label>
            <Input id="eu-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={submitting} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eu-role">Role</Label>
            <Select value={role} onValueChange={setRole} disabled={submitting}>
              <SelectTrigger id="eu-role"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
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

/* ── Update Password Dialog ── */
function UpdatePasswordDialog({ user, onUpdated }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const checks = useMemo(() => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    match: password.length > 0 && password === confirm,
  }), [password, confirm])

  const canSubmit = !submitting && Object.values(checks).every(Boolean)

  function handleOpen(val) {
    setOpen(val)
    if (val) { setPassword(''); setConfirm(''); setError(null); setSuccess(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setSubmitting(true)
    try {
      await updateUserPassword(user.id, { password })
      setSuccess(true)
      setTimeout(() => { setOpen(false); setSuccess(false) }, 1200)
      onUpdated?.()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not update password'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Update password"><KeyRound className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Password</DialogTitle>
          <DialogDescription className="truncate text-xs">{user.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor={`up-username-${user.id}`} className="sr-only">
            Account email
          </label>
          <Input
            id={`up-username-${user.id}`}
            type="email"
            name="username"
            autoComplete="username"
            value={user.email}
            readOnly
            tabIndex={-1}
            className="sr-only h-0 w-0 overflow-hidden border-0 p-0 opacity-0"
            aria-hidden="true"
          />
          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
          {success && <Alert variant="success" className="border-emerald-200 bg-emerald-50"><AlertDescription className="text-emerald-800">Password updated successfully.</AlertDescription></Alert>}
          <div className="space-y-1.5">
            <Label htmlFor="up-pass">New Password</Label>
            <Input id="up-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={submitting} autoComplete="new-password" />
            <ul className="space-y-0.5 mt-1.5">
              <PasswordCheck pass={checks.length} label="At least 8 characters" />
              <PasswordCheck pass={checks.upper} label="One uppercase letter" />
              <PasswordCheck pass={checks.lower} label="One lowercase letter" />
              <PasswordCheck pass={checks.digit} label="One digit" />
            </ul>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="up-confirm">Confirm Password</Label>
            <Input id="up-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required disabled={submitting} autoComplete="new-password" />
            {confirm.length > 0 && !checks.match && (
              <p className="text-xs text-destructive">Passwords do not match.</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button type="button" variant="outline" disabled={submitting}>Cancel</Button></DialogClose>
            <Button type="submit" disabled={!canSubmit}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{submitting ? 'Updating…' : 'Update Password'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/* ── Delete User Dialog ── */
function DeleteUserDialog({ user, onDeleted }) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)

  async function handleDelete() {
    setError(null)
    setDeleting(true)
    try {
      await deleteUser(user.id)
      onDeleted?.()
      setOpen(false)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not delete user'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50" aria-label="Delete user"><Trash2 className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>This action cannot be undone. The user will lose all access.</DialogDescription>
        </DialogHeader>
        <div className="rounded-md bg-muted/40 border border-border px-4 py-3 text-sm">
          <p className="font-medium">{user.fullName}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{user.email} · {user.role}</p>
        </div>
        {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        <DialogFooter className="gap-2">
          <DialogClose asChild><Button type="button" variant="outline" disabled={deleting}>Cancel</Button></DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{deleting ? 'Deleting…' : 'Delete User'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ── Main Page ── */
export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState(null)
  const [globalSuccess, setGlobalSuccess] = useState(null)

  const loadUsers = useCallback(async () => {
    setListError(null)
    setLoading(true)
    try {
      const data = await listUsers()
      setUsers(data.users ?? [])
    } catch (err) {
      setListError(getApiErrorMessage(err, 'Could not load users'))
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  function handleRefresh(msg) {
    loadUsers()
    if (msg) {
      setGlobalSuccess(msg)
      setTimeout(() => setGlobalSuccess(null), 3000)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">User Management</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create, edit, and delete operator accounts.
          </p>
        </div>
        <CreateUserDialog onCreated={() => handleRefresh()} />
      </div>

      {globalSuccess && (
        <Alert variant="success" className="border-emerald-200 bg-emerald-50">
          <AlertDescription className="text-emerald-800">{globalSuccess}</AlertDescription>
        </Alert>
      )}

      {listError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {listError}
            <Button variant="link" size="sm" className="ml-2 h-auto p-0" onClick={loadUsers}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {loading ? 'Loading…' : `${users.length} user${users.length === 1 ? '' : 's'} total`}
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [1, 2, 3].map((i) => (
                <TableRow key={i}>
                  {[1, 2, 3, 4].map((j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No users found.</TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell><RoleBadge role={u.role} /></TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      <EditUserDialog user={u} onUpdated={() => handleRefresh()} />
                      <UpdatePasswordDialog user={u} onUpdated={() => handleRefresh()} />
                      <DeleteUserDialog user={u} onDeleted={() => handleRefresh()} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
