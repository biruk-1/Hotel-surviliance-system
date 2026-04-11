import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/routes'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import logo from '@/assets/logo.png'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const TITLES = {
  '/hotel/dashboard': 'Dashboard',
  '/hotel/guests/register': 'Register Guest',
  '/hotel/guests': 'Guest List',
  '/hotel/reports': 'Guest list report',
  '/hotel/alerts': 'Alerts',
  '/police/dashboard': 'Dashboard',
  '/police/guests': 'Search Guests',
  '/police/alerts': 'Alerts',
  '/police/blacklist': 'Blacklist',
  '/police/reports': 'Reports',
  '/admin/dashboard': 'Dashboard',
  '/admin/reports': 'Reports',
  '/admin/hotels': 'Hotel Management',
  '/admin/users': 'User Management',
  '/login': 'Sign In',
}

const PORTAL_LABELS = {
  hotel: 'Hotel Portal',
  police: 'Police Portal',
  admin: 'Administration Portal',
}

function getInitials(name) {
  if (!name) return '??'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function Header({ portal, showUserMenu = true, className }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const heading = TITLES[location.pathname] ?? 'Overview'
  const portalLabel = PORTAL_LABELS[portal] ?? 'Public Access'

  function handleLogout() {
    logout()
    navigate(ROUTES.login, { replace: true })
  }

  return (
    <header className={cn('sticky top-0 z-40 h-16 shrink-0 border-b border-border bg-card/95 backdrop-blur-sm shadow-sm', className)}>
      <div className="flex h-full items-center gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={logo}
            alt="Adama city administration logo"
            className="h-10 w-10 rounded-md border border-border/80 bg-white object-contain p-0.5 shadow-card"
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {portalLabel}
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              Hotel Surveillance Management
            </p>
          </div>
        </div>

        <div className="ml-auto hidden min-w-0 flex-1 sm:block">
          <h1 className="truncate text-right text-sm font-semibold text-foreground">{heading}</h1>
        </div>

        {!showUserMenu && (
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link to={ROUTES.login}>Sign in</Link>
          </Button>
        )}

        {showUserMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="gap-2 px-2 h-9 text-sm font-normal hover:bg-accent"
                aria-label="User menu"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-[11px] font-semibold bg-primary text-primary-foreground">
                    {getInitials(user?.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden sm:block leading-tight">
                  <p className="text-sm font-medium text-foreground">{user?.fullName ?? '-'}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-52 shadow-dropdown">
              <DropdownMenuLabel className="py-2">
                <p className="font-semibold text-sm leading-tight">{user?.fullName ?? '-'}</p>
                <p className="text-xs text-muted-foreground font-normal truncate mt-0.5">
                  {user?.email ?? ''}
                </p>
                <p className="text-[11px] text-muted-foreground/70 font-normal capitalize mt-0.5">
                  {user?.role ?? '-'}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive focus:bg-red-50 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
