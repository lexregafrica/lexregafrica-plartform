'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { IconLayoutDashboard, IconBuilding, IconArrowBackUp } from '@tabler/icons-react'
import { DashboardShell, type ShellNavItem } from '@/components/dashboard/shell'

// Super-admin console frame — same shell as the owner app, admin
// navigation (mockup Admin*, modelled on the Zeno admin console).
const ADMIN_NAV: ShellNavItem[] = [
  { label: 'Overview', href: '/admin', icon: IconLayoutDashboard, soon: false, exact: true },
  { label: 'Entities', href: '/admin/entities', icon: IconBuilding, soon: false },
  { label: 'Owner view', href: '/dashboard', icon: IconArrowBackUp, soon: false },
]

export function AdminShell({ userName, userEmail, children }: { userName: string; userEmail: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const onEntity = /^\/admin\/entities\/[^/]+/.test(pathname)
  const crumbs = pathname === '/admin'
    ? <span className="here">Overview</span>
    : onEntity
      ? <><Link href="/admin/entities">Entities</Link><span aria-hidden="true">/</span><span className="here">Entity</span></>
      : <span className="here">Entities</span>

  return (
    <DashboardShell userName={userName} userEmail={userEmail} navItems={ADMIN_NAV} brandSub="Admin" homeHref="/admin" title="Admin" crumbs={crumbs}>
      {children}
    </DashboardShell>
  )
}
