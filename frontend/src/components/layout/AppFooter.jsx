import { cn } from '@/lib/utils'

export default function AppFooter({ className }) {
  const year = new Date().getFullYear()

  return (
    <footer className={cn('shrink-0 border-t border-border bg-card', className)}>
      <div className="flex min-h-14 flex-col justify-center gap-1 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>Adama City Administration - Hotel Surveillance Platform</p>
        <p>Copyright {year}. Secure operations portal.</p>
      </div>
    </footer>
  )
}
