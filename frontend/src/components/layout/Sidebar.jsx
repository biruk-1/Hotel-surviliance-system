import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Bell,
  ShieldAlert,
  Search,
  Building2,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Hotel,
  UserCog,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const NAV = {
  hotel: {
    title: 'Hotel Portal',
    subtitle: 'Staff access',
    icon: Hotel,
    items: [
      { to: '/hotel/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/hotel/guests/register', label: 'Register Guest', icon: UserPlus, end: true },
      { to: '/hotel/guests', label: 'Guest List', icon: Users, end: true },
      { to: '/hotel/alerts', label: 'Alerts', icon: Bell, end: true },
    ],
  },
  police: {
    title: 'Police Portal',
    subtitle: 'Operations access',
    icon: Shield,
    items: [
      { to: '/police/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/police/guests', label: 'Search Guests', icon: Search, end: true },
      { to: '/police/alerts', label: 'Alerts', icon: Bell, end: true },
      { to: '/police/blacklist', label: 'Blacklist', icon: ShieldAlert, end: true },
    ],
  },
  admin: {
    title: 'Admin Portal',
    subtitle: 'System access',
    icon: Settings,
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/hotels', label: 'Hotels', icon: Building2, end: true },
      { to: '/admin/users', label: 'Users', icon: UserCog, end: true },
    ],
  },
}

export default function Sidebar({ portal }) {
  const [collapsed, setCollapsed] = useState(false)
  const config = NAV[portal]
  const PortalIcon = config.icon

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          'flex flex-col h-full bg-sidebar text-sidebar-foreground',
          'border-r border-sidebar-border',
          'transition-[width] duration-200 ease-in-out overflow-hidden shrink-0',
          collapsed ? 'w-14' : 'w-56',
        )}
      >
        {/* ── Brand ── */}
        <div
          className={cn(
            'flex items-center gap-3 h-14 shrink-0 border-b border-sidebar-border',
            collapsed ? 'justify-center px-0' : 'px-4',
          )}
        >
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sidebar-primary"
            aria-hidden
          >
            <PortalIcon className="h-3.5 w-3.5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="text-[10px] font-medium text-sidebar-foreground/40 uppercase tracking-widest">
                Surveillance
              </p>
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                {config.title}
              </p>
            </div>
          )}
        </div>

        {/* ── Nav items ── */}
        <nav className="flex-1 flex flex-col gap-0.5 p-2 pt-3">
          {config.items.map((item) => {
            const Icon = item.icon

            const linkContent = ({ isActive }) => (
              <span
                className={cn(
                  'flex items-center gap-2.5 w-full rounded-md px-2.5 py-2 text-sm',
                  'transition-colors duration-100 cursor-pointer',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                  collapsed && 'justify-center px-0',
                )}
              >
                {/* Active indicator bar */}
                {!collapsed && (
                  <span
                    className={cn(
                      'absolute left-0 top-1 bottom-1 w-0.5 rounded-r-full transition-opacity duration-100',
                      isActive ? 'opacity-100 bg-sidebar-primary' : 'opacity-0',
                    )}
                    aria-hidden
                  />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </span>
            )

            const navLink = (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="relative block"
              >
                {linkContent}
              </NavLink>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return navLink
          })}
        </nav>

        {/* ── Collapse toggle ── */}
        <div className="shrink-0 border-t border-sidebar-border p-2">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-xs',
              'text-sidebar-foreground/40 hover:text-sidebar-foreground/70',
              'hover:bg-sidebar-accent/50 transition-colors duration-100',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-3.5 w-3.5 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
