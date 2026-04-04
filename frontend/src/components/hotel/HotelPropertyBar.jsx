import { useHotelScope } from '../../hooks/useHotelScope'
import { getApiErrorMessage } from '../../utils/apiError'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Building2, AlertCircle } from 'lucide-react'

export default function HotelPropertyBar() {
  const { hotels, selectedHotelId, setSelectedHotelId, loading, error } = useHotelScope()

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-6 py-2.5 border-b bg-muted/30 text-sm text-muted-foreground">
        <Building2 className="h-4 w-4 animate-pulse" />
        Loading properties…
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-6 py-2 border-b">
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {getApiErrorMessage(error, 'Could not load your hotel assignments')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!hotels.length) {
    return (
      <div className="px-6 py-2 border-b">
        <Alert className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            No property is assigned to your account. Contact an administrator.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-6 py-2.5 border-b bg-muted/20">
      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
      <Label htmlFor="hotel-property-select" className="text-sm font-medium shrink-0">
        Property
      </Label>
      <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
        <SelectTrigger id="hotel-property-select" className="h-8 w-auto min-w-[200px] text-sm">
          <SelectValue placeholder="Select property…" />
        </SelectTrigger>
        <SelectContent>
          {hotels.map((h) => (
            <SelectItem key={h.id} value={h.id}>
              {[h.name, h.city].filter(Boolean).join(' · ') || h.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
