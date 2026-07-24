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

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: IconLayoutDashboard, soon: false },
  { label: 'Documents', href: '/dashboard/documents', icon: IconFiles, soon: true },
  { label: 'Compliance', href: '/dashboard/compliance', icon: IconCalendarTime, soon: true },
  { label: 'Services', href: '/dashboard/services', icon: IconBriefcase, soon: true },
  { label: 'Settings', href: '/dashboard/settings', icon: IconSettings, soon: true },
]

const ADMIN_NAV_ITEM = { label: 'Admin', href: '/admin', icon: IconShieldLock, soon: false }

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
  children,
}: {
  userName: string
  userEmail: string
  isSuperAdmin?: boolean
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const nav = isSuperAdmin ? [...NAV, ADMIN_NAV_ITEM] : NAV

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/')
  }

  const today = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="flex min-h-[100dvh]">
      {/* Sidebar — desktop only; mobile gets a slim top bar */}
      <aside
        className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col rounded-r-3xl px-4 py-6 md:flex"
        style={{ background: 'var(--system-bg)' }}
      >
        <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2">
          <LexRegLogoMark className="h-7 w-7" />
          <span className="text-ios-headline font-bold" style={{ color: 'var(--brand-navy)' }}>
            LexReg
          </span>
        </Link>

        <nav className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.soon ? '#' : item.href}
                aria-disabled={item.soon}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-ios-footnote font-semibold transition-colors ${item.soon ? 'cursor-default opacity-45' : ''}`}
                style={active
                  ? { background: 'rgba(128,0,32,0.08)', color: 'var(--brand-navy)' }
                  : { color: 'var(--system-label-2)' }}
                onClick={item.soon ? (e) => e.preventDefault() : undefined}
              >
                <item.icon size={19} stroke={2} />
                {item.label}
                {item.soon && (
                  <span className="text-ios-caption2 ml-auto rounded-full px-1.5 py-0.5" style={{ background: 'var(--system-fill-3)', color: 'var(--system-label-3)' }}>
                    soon
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Profile + logout pinned to bottom */}
        <div className="mt-auto">
          <div className="mb-3 flex items-center gap-3 px-2">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
              style={{ background: 'var(--brand-navy)' }}
            >
              {initials(userName)}
            </div>
            <div className="min-w-0">
              <p className="text-ios-footnote truncate font-semibold" style={{ color: 'var(--system-label)' }}>{userName}</p>
              <p className="text-ios-caption1 truncate" style={{ color: 'var(--system-label-3)' }}>{userEmail}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-ios-footnote font-semibold transition-colors hover:opacity-70"
            style={{ color: 'var(--system-label-2)' }}
          >
            <IconLogout size={19} stroke={2} />
            Log out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="min-w-0 flex-1">
        {/* Mobile top bar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3 backdrop-blur-xl md:hidden"
          style={{ borderColor: 'var(--system-fill-3)', background: 'color-mix(in srgb, var(--system-bg) 88%, transparent)' }}
        >
          <Link href="/dashboard" className="flex items-center gap-2">
            <LexRegLogoMark className="h-6 w-6" />
            <span className="text-ios-subhead font-bold" style={{ color: 'var(--brand-navy)' }}>LexReg</span>
          </Link>
          <button type="button" onClick={handleSignOut} className="text-ios-footnote font-medium" style={{ color: 'var(--system-label-2)' }}>
            Sign out
          </button>
        </header>

        {/* Desktop header */}
        <header className="hidden items-center justify-between px-8 pt-7 md:flex">
          <div>
            <h1 className="text-ios-title1" style={{ color: 'var(--system-label)' }}>Dashboard</h1>
            <p className="text-ios-footnote mt-0.5" style={{ color: 'var(--system-label-3)' }}>{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold text-white"
              style={{ background: 'var(--brand-navy)' }}
            >
              {initials(userName)}
            </div>
            <div className="hidden lg:block">
              <p className="text-ios-footnote font-semibold" style={{ color: 'var(--system-label)' }}>{userName}</p>
              <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>Business owner</p>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  )
}
