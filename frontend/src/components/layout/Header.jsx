import { useLocation, useNavigate } from 'react-router-dom'
import { LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/routes'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
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
  '/hotel/alerts': 'Alerts',
  '/police/dashboard': 'Dashboard',
  '/police/guests': 'Search Guests',
  '/police/alerts': 'Alerts',
  '/police/blacklist': 'Blacklist',
  '/admin/dashboard': 'Dashboard',
  '/admin/hotels': 'Hotel Management',
  '/admin/users': 'User Management',
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

export default function Header({ portal }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const heading = TITLES[location.pathname] ?? 'Dashboard'

  function handleLogout() {
    logout()
    navigate(ROUTES.login, { replace: true })
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-background/95 backdrop-blur-sm px-6 shrink-0">
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-[15px] font-semibold text-foreground truncate leading-tight">
          {heading}
        </h1>
      </div>

      {/* User menu */}
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
              <p className="text-sm font-medium text-foreground">{user?.fullName ?? '—'}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52 shadow-dropdown">
          <DropdownMenuLabel className="py-2">
            <p className="font-semibold text-sm leading-tight">{user?.fullName ?? '—'}</p>
            <p className="text-xs text-muted-foreground font-normal truncate mt-0.5">
              {user?.email ?? ''}
            </p>
            <p className="text-[11px] text-muted-foreground/70 font-normal capitalize mt-0.5">
              {user?.role ?? '—'}
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
    </header>
  )
}
