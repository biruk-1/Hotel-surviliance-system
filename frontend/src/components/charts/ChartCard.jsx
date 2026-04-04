import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Wrapper card for a chart with title, description, and loading/empty states.
 */
export default function ChartCard({
  title,
  description,
  loading = false,
  empty = false,
  emptyText = 'No data available',
  height = 220,
  className,
  children,
}) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {description && (
          <CardDescription className="text-xs">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-4 pt-0">
        {loading ? (
          <div
            className="flex flex-col gap-2"
            style={{ height }}
            aria-busy="true"
          >
            <Skeleton className="h-full w-full rounded-md" />
          </div>
        ) : empty ? (
          <div
            className="flex items-center justify-center rounded-md bg-muted/30 text-sm text-muted-foreground"
            style={{ height }}
          >
            {emptyText}
          </div>
        ) : (
          <div style={{ height }}>{children}</div>
        )}
      </CardContent>
    </Card>
  )
}
