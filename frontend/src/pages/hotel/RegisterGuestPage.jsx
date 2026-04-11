import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, ShieldAlert } from 'lucide-react'
import { useHotelScope } from '../../hooks/useHotelScope'
import { createGuestWithStay } from '../../services/guestService'
import { getApiErrorMessage } from '../../utils/apiError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

function toIsoFromLocalDatetime(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export default function RegisterGuestPage() {
  const { loading: scopeLoading, error: scopeError, hotels, selectedHotelId } = useHotelScope()
  const [fullName, setFullName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [hotelId, setHotelId] = useState('')
  const [checkInLocal, setCheckInLocal] = useState('')
  const [checkOutLocal, setCheckOutLocal] = useState('')
  const [phone, setPhone] = useState('')
  const [roomNumber, setRoomNumber] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (selectedHotelId) setHotelId(selectedHotelId)
  }, [selectedHotelId])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setResult(null)
    const checkIn = toIsoFromLocalDatetime(checkInLocal)
    if (!checkIn) { setError('Check-in date and time are required'); return }
    if (!hotelId) { setError('Select a property'); return }
    const checkOut = checkOutLocal ? toIsoFromLocalDatetime(checkOutLocal) : undefined
    if (checkOutLocal && !checkOut) { setError('Checkout date and time are invalid'); return }
    setSubmitting(true)
    try {
      const data = await createGuestWithStay({
        fullName: fullName.trim(),
        idNumber: idNumber.trim(),
        hotelId,
        checkIn,
        checkOut,
        phone: phone.trim() || undefined,
        roomNumber: roomNumber.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
      })
      setResult(data)
      setFullName('')
      setIdNumber('')
      setRoomNumber('')
      setDateOfBirth('')
      setCheckInLocal('')
      setCheckOutLocal('')
      setPhone('')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration failed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (scopeLoading) {
    return (
      <Card className="max-w-2xl">
        <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold">Register Guest</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Create a new guest record and check-in stay</p>
      </div>

      {result && (
        <Alert variant="success" className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Guest registered successfully</AlertTitle>
          <AlertDescription className="text-green-700">
            <p>
              Guest ID: <code className="text-xs bg-green-100 rounded px-1">{result.guest?.id}</code>
              {' · '}
              Stay ID: <code className="text-xs bg-green-100 rounded px-1">{result.stay?.id}</code>
            </p>
            {result.blacklistCheck && (
              <div className="mt-2 pt-2 border-t border-green-200">
                <p className="font-medium flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  Blacklist match detected
                </p>
                <pre className="text-xs mt-1 overflow-auto max-h-32 bg-green-100 rounded p-2">
                  {JSON.stringify(result.blacklistCheck, null, 2)}
                </pre>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Guest Information</CardTitle>
          <CardDescription>All fields marked required must be filled</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={submitting}
                  autoComplete="name"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idNumber">ID Number <span className="text-destructive">*</span></Label>
                <Input
                  id="idNumber"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  required
                  disabled={submitting}
                  placeholder="National ID or Passport"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="property">Property <span className="text-destructive">*</span></Label>
                <Select value={hotelId} onValueChange={setHotelId} disabled={submitting} required>
                  <SelectTrigger id="property">
                    <SelectValue placeholder="Select property…" />
                  </SelectTrigger>
                  <SelectContent>
                    {hotels.map((h) => (
                      <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkIn">Check-in Date &amp; Time <span className="text-destructive">*</span></Label>
                <Input
                  id="checkIn"
                  type="datetime-local"
                  value={checkInLocal}
                  onChange={(e) => setCheckInLocal(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={submitting}
                  autoComplete="tel"
                  placeholder="+251 9…"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkOut">Planned Checkout</Label>
                <Input
                  id="checkOut"
                  type="datetime-local"
                  value={checkOutLocal}
                  onChange={(e) => setCheckOutLocal(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="room">Room Number</Label>
                <Input
                  id="room"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  disabled={submitting}
                  placeholder="e.g. 101"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? 'Registering…' : 'Register Guest'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
