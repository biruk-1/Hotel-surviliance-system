import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        /* Dark solid — for important labels */
        default:
          'border-transparent bg-primary text-primary-foreground',
        /* Light gray — neutral tags */
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        /* Muted red — errors/danger */
        destructive:
          'border-transparent bg-red-100 text-red-700 border-red-200',
        /* No fill — outlined */
        outline:
          'border-border text-foreground',
        /* Amber — caution/pending, not alarming */
        warning:
          'border-transparent bg-amber-50 text-amber-700 border-amber-200',
        /* Muted green — success/active */
        success:
          'border-transparent bg-emerald-50 text-emerald-700 border-emerald-200',
        /* Neutral slate — informational (replaces blue) */
        info:
          'border-transparent bg-slate-100 text-slate-600 border-slate-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
