'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeftRight, Building2, FileSignature, LayoutDashboard, LogOut, Sparkles } from 'lucide-react'
import {
  DashboardMenu,
  DashboardMenuContent,
  DashboardMenuItem,
  DashboardMenuLabel,
  DashboardMenuSeparator,
  DashboardMenuTrigger,
  DashboardShell,
  type DashboardShellNavSection,
} from '@/components/block/dashboard-shell'
import { LexRegLogoMark } from '@/components/ui/lexreg-logo'
import { createClient } from '@/lib/supabase/client'

// Super-admin console: same Obsidian shell and LexReg tokens as the owner
// app, in the dark "console" appearance so Charles always knows which side
// of the platform he is on. Pages render .lx content in its dark variant.

const NAV: DashboardShellNavSection[] = [
  {
    id: 'console',
    title: 'Console',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/admin' },
      { id: 'entities', label: 'Entities', icon: Building2, href: '/admin/entities' },
      { id: 'reviews', label: 'Review queue', icon: FileSignature, href: '/admin/reviews' },
    ],
  },
  {
    id: 'labs',
    title: 'Previews',
    items: [{ id: 'mockups', label: 'AI & dashboard mockups', icon: Sparkles, href: '/mockups/ai' }],
  },
]

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function AdminShell({ userName, userEmail, children }: { userName: string; userEmail: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const activeItemId = pathname.startsWith('/mockups')
    ? 'mockups'
    : pathname.startsWith('/admin/reviews')
      ? 'reviews'
      : pathname.startsWith('/admin/entities')
      ? 'entities'
      : 'overview'
  const title = /^\/admin\/entities\/[^/]+/.test(pathname)
    ? 'Entity'
    : activeItemId === 'reviews'
      ? 'Review queue'
      : activeItemId === 'entities'
      ? 'Entities'
      : activeItemId === 'mockups'
        ? 'Mockups'
        : 'Overview'

  const signOut = async () => {
    await createClient().auth.signOut()
    router.replace('/')
  }

  return (
    <div className="dark h-[100dvh]">
      <DashboardShell
        brand={{ name: 'LexReg', description: 'Admin console', logo: <LexRegLogoMark size={22} className="invert" /> }}
        navigation={NAV}
        secondaryNavigation={[{ id: 'owner', label: 'Switch to owner view', icon: ArrowLeftRight, href: '/dashboard' }]}
        activeItemId={activeItemId}
        title={title}
        status="Super admin"
        statusTone="warning"
        linkComponent={Link}
        headerActions={
          <DashboardMenu>
            <DashboardMenuTrigger asChild>
              <button type="button" aria-label={`Account: ${userName}`} className="grid size-[30px] place-items-center rounded-full bg-[#800020] text-[11px] font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-(--obsidian-dashboard-shell-ring)">
                {initials(userName)}
              </button>
            </DashboardMenuTrigger>
            <DashboardMenuContent align="end">
              <DashboardMenuLabel>
                <span className="block truncate text-sm font-medium">{userName}</span>
                <span className="block truncate text-xs font-normal text-(--obsidian-dashboard-shell-text-muted)">{userEmail}</span>
              </DashboardMenuLabel>
              <DashboardMenuSeparator />
              <DashboardMenuItem onSelect={() => router.push('/dashboard')}><ArrowLeftRight aria-hidden />Owner view</DashboardMenuItem>
              <DashboardMenuItem onSelect={signOut}><LogOut aria-hidden />Sign out</DashboardMenuItem>
            </DashboardMenuContent>
          </DashboardMenu>
        }
      >
        <div className="lx lx-dark min-h-full">{children}</div>
      </DashboardShell>
    </div>
  )
}
