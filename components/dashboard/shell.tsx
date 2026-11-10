'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  IconLayoutDashboard,
  IconFiles,
  IconCalendarTime,
  IconBriefcase,
  IconSettings,
  IconLogout,
  IconShieldLock,
} from '@tabler/icons-react'
import { LexRegLogoMark } from '@/components/ui/lexreg-logo'
import { createClient } from '@/lib/supabase/client'

// Design system v2 shell (resources/mockups/ui-revamp): translucent sidebar
// on regular width; floating top pill + glass tab bar on compact width.
// Layout switches on the .lx container, not the viewport.

export type ShellNavItem = { label: string; href: string; icon: typeof IconLayoutDashboard; soon: boolean; exact?: boolean }

const NAV: ShellNavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: IconLayoutDashboard, soon: false },
  { label: 'Documents', href: '/dashboard/documents', icon: IconFiles, soon: true },
  { label: 'Compliance', href: '/dashboard/compliance', icon: IconCalendarTime, soon: true },
  { label: 'Services', href: '/dashboard/services', icon: IconBriefcase, soon: false },
  { label: 'Settings', href: '/dashboard/settings', icon: IconSettings, soon: true },
]

const ADMIN_NAV_ITEM: ShellNavItem = { label: 'Admin', href: '/admin', icon: IconShieldLock, soon: false }

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function DashboardShell({
  userName,
  userEmail,
  isSuperAdmin,
  title,
  crumbs,
  navItems,
  brandSub = 'Africa',
  homeHref = '/dashboard',
  children,
}: {
  userName: string
  userEmail: string
  isSuperAdmin?: boolean
  title?: string
  crumbs?: React.ReactNode
  /** Replaces the owner navigation (the admin console passes its own) */
  navItems?: ShellNavItem[]
  brandSub?: string
  homeHref?: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const nav = navItems ?? (isSuperAdmin ? [...NAV, ADMIN_NAV_ITEM] : NAV)
  const liveNav = nav.filter((item) => !item.soon)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/')
  }

  // Entity workspaces live under /dashboard/<id>, so Overview stays lit there
  const isActive = (href: string) => {
    const item = nav.find((n) => n.href === href)
    if (item?.exact) return pathname === href
    // A more specific live item (e.g. /dashboard/services) wins over its parent
    const deeper = nav.some((n) => !n.soon && n.href !== href && n.href.startsWith(href) && pathname.startsWith(n.href))
    return pathname.startsWith(href) && !deeper
  }

  return (
    <div className="lx shell min-h-[100dvh]">
      <aside className="sidebar glass-chrome sticky top-0 h-[100dvh]" aria-label="Main navigation">
        <Link className="sb-brand" href={homeHref}>
          <LexRegLogoMark size={30} />
          <span className="sb-word">LexReg<small>{brandSub}</small></span>
        </Link>

        {nav.map((item) =>
          item.soon ? (
            <span key={item.href} className="sb-item" aria-disabled="true" style={{ opacity: 0.5, cursor: 'default' }}>
              <item.icon size={18} stroke={1.75} aria-hidden="true" />
              {item.label}
              <span className="pill">Soon</span>
            </span>
          ) : (
            <Link key={item.href} href={item.href} className={`sb-item ${isActive(item.href) ? 'is-on' : ''}`} aria-current={isActive(item.href) ? 'page' : undefined}>
              <item.icon size={18} stroke={1.75} aria-hidden="true" />
              {item.label}
            </Link>
          )
        )}

        <div className="sb-foot">
          <span className="avatar avatar-sm">{initials(userName)}</span>
          <div className="min-w-0 flex-1">
            <p className="t-subhead truncate" style={{ color: 'var(--label)' }}>{userName}</p>
            <p className="t-caption t-3 truncate">{userEmail}</p>
          </div>
          <button className="btn btn-plain btn-icon btn-sm" type="button" aria-label="Log out" onClick={handleSignOut}>
            <IconLogout size={17} stroke={1.75} aria-hidden="true" />
          </button>
        </div>
      </aside>

      <div className="main">
        {(crumbs || title) && (
          <header className="topbar">
            <nav className="crumbs" aria-label="Breadcrumb">
              {crumbs ?? <span className="here">{title}</span>}
            </nav>
          </header>
        )}

        <div className="m-topbar glass">
          <Link className="flex items-center gap-2" href={homeHref} style={{ color: 'var(--label)' }}>
            <LexRegLogoMark size={26} />
            <span className="t-headline">{title ?? 'LexReg'}</span>
          </Link>
          <div className="flex items-center gap-1">
            <button type="button" className="btn btn-plain btn-sm" onClick={handleSignOut}>Sign out</button>
            <span className="avatar avatar-sm">{initials(userName)}</span>
          </div>
        </div>

        {children}

        {/* Phone tab bar: live destinations only — a tab bar of "soon"
            items is noise, and one tab is no navigation at all. */}
        {liveNav.length > 1 && (
          <nav className="m-tabbar glass" aria-label="Tabs" style={{ gridTemplateColumns: `repeat(${liveNav.length}, minmax(0, 1fr))` }}>
            {liveNav.map((item) => (
              <Link key={item.href} href={item.href} className={`m-tab ${isActive(item.href) ? 'is-on' : ''}`} aria-current={isActive(item.href) ? 'page' : undefined}>
                <item.icon size={22} stroke={1.75} aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}
