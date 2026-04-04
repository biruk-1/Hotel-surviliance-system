import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function InlineSpinner({ size = 'md', label = 'Loading' }) {
  const sizeClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'
  return (
    <Loader2
      className={cn('animate-spin text-muted-foreground', sizeClass)}
      role="status"
      aria-label={label}
    />
  )
}
