import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-card px-3 py-2 text-sm',
        'ring-offset-background placeholder:text-muted-foreground/60',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:border-ring/80',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
        'transition-colors duration-150',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
