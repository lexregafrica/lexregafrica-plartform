'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid,
  FolderOpen,
  CalendarClock,
  Users2,
  ShieldCheck,
  Settings,
  Building2,
  Gavel,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Entities', icon: LayoutGrid },
  { href: '/documents', label: 'Documents', icon: FolderOpen, soon: true },
  { href: '/compliance', label: 'Compliance', icon: CalendarClock, soon: true },
  { href: '/governance', label: 'Governance', icon: Users2, soon: true },
  { href: '/legal-audit', label: 'Legal Audit', icon: ShieldCheck, soon: true },
]

const ADMIN_ITEMS = [
  { href: '/admin/organisations', label: 'All Organisations', icon: Building2, soon: true },
  { href: '/admin/lawyers', label: 'Lawyers', icon: Gavel, soon: true },
]

type Props = {
  isAdmin?: boolean
}

export function Sidebar({ isAdmin }: Props) {
  const pathname = usePathname()

  return (
    <aside
      className="w-[220px] shrink-0 flex flex-col h-full"
      style={{ background: 'var(--brand-navy)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <LogoMark />
        <span className="text-white font-semibold text-sm tracking-tight leading-tight">
          LexReg<br />
          <span className="font-normal text-white/50 text-xs">Africa</span>
        </span>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon, soon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <NavItem
              key={href}
              href={href}
              label={label}
              icon={<Icon className="size-4" />}
              active={active}
              soon={soon}
            />
          )
        })}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                Admin
              </span>
            </div>
            {ADMIN_ITEMS.map(({ href, label, icon: Icon, soon }) => (
              <NavItem
                key={href}
                href={href}
                label={label}
                icon={<Icon className="size-4" />}
                active={pathname.startsWith(href)}
                soon={soon}
              />
            ))}
          </>
        )}
      </nav>

      {/* Settings at bottom */}
      <div className="px-3 py-3 border-t border-white/10">
        <NavItem
          href="/settings"
          label="Settings"
          icon={<Settings className="size-4" />}
          active={pathname.startsWith('/settings')}
          soon
        />
      </div>
    </aside>
  )
}

function NavItem({
  href,
  label,
  icon,
  active,
  soon,
}: {
  href: string
  label: string
  icon: React.ReactNode
  active: boolean
  soon?: boolean
}) {
  const base = 'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors'

  if (soon && !active) {
    return (
      <span className={cn(base, 'text-white/35 cursor-default select-none')}>
        {icon}
        {label}
        <span className="ml-auto text-[9px] font-medium uppercase tracking-wider text-white/25">
          soon
        </span>
      </span>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        base,
        active
          ? 'bg-white/10 text-white font-medium'
          : 'text-white/60 hover:bg-white/5 hover:text-white'
      )}
    >
      {icon}
      {label}
    </Link>
  )
}

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="var(--brand-gold, #c9a227)" />
      <path
        d="M8 8h4v12h8v4H8V8zM18 8h6l-4 8 4 8h-6l-4-8 4-8z"
        fill="var(--brand-navy, #1a1a2e)"
      />
    </svg>
  )
}
