import { cn } from '@/lib/utils'

/**
 * Small red badge for unseen counts (sidebar, etc.). Hidden when count is zero.
 * @param {{ count: number; className?: string; collapsed?: boolean }} props
 */
export function NavNotificationBadge({ count, className, collapsed }) {
  if (!count || count < 1) return null
  const label = count > 99 ? '99+' : String(count)
  return (
    <span
      role="status"
      aria-label={`${count > 99 ? '99+' : count} unseen alerts`}
      className={cn(
        'pointer-events-none absolute z-[1] flex min-w-[1.125rem] h-[1.125rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white shadow-sm tabular-nums',
        collapsed
          ? 'right-0 top-0 translate-x-0.5 -translate-y-0.5'
          : 'right-2 top-1/2 -translate-y-1/2',
        className,
      )}
    >
      {label}
    </span>
  )
}
