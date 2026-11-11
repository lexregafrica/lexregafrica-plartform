'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Briefcase, Building2, LayoutDashboard, LogOut, Plus, Scale, Settings, ShieldCheck } from 'lucide-react'
import {
  dashboardButtonVariants,
  DashboardMenu,
  DashboardMenuContent,
  DashboardMenuItem,
  DashboardMenuLabel,
  DashboardMenuSeparator,
  DashboardMenuTrigger,
  DashboardShell,
  type DashboardShellNavItem,
  type DashboardShellNavSection,
} from '@/components/block/dashboard-shell'
import { LexRegLogoMark } from '@/components/ui/lexreg-logo'
import { createClient } from '@/lib/supabase/client'

// The signed-in frame for owners and lawyers (Obsidian dashboard shell,
// LexReg colours). Lives in the (dashboard) layout, so it stays put while
// pages change underneath it.

export type FrameEntity = { id: string; label: string; color: string }

type Props = {
  role: 'super_admin' | 'business_owner' | 'lawyer'
  userName: string
  userEmail: string
  entities: FrameEntity[]
  openMatters: number
  children: React.ReactNode
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function OwnerFrame({ role, userName, userEmail, entities, openMatters, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const isLawyer = role === 'lawyer'

  const workspace: DashboardShellNavItem[] = isLawyer
    ? [
        { id: 'matters', label: 'My matters', icon: Scale, href: '/dashboard/matters', count: openMatters || undefined },
        { id: 'settings', label: 'Settings', icon: Settings, href: '/dashboard/settings' },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
        { id: 'entities', label: 'Entities', icon: Building2, href: '/dashboard/entities', count: entities.length },
        { id: 'matters', label: 'Matters', icon: Scale, href: '/dashboard/matters', count: openMatters || undefined },
        { id: 'services', label: 'Services', icon: Briefcase, href: '/dashboard/services' },
        { id: 'settings', label: 'Settings', icon: Settings, href: '/dashboard/settings' },
      ]

  const navigation: DashboardShellNavSection[] = [
    { id: 'workspace', items: workspace },
    {
      id: 'entities',
      title: isLawyer ? 'Assigned to you' : 'Your entities',
      items: entities.slice(0, 6).map((e) => ({ id: `entity-${e.id}`, label: e.label, color: e.color, href: `/dashboard/${e.id}` })),
    },
  ]

  const segment = pathname.replace(/^\/dashboard\/?/, '').split('/')[0]
  const entity = entities.find((e) => e.id === segment)
  const activeItemId = segment === '' ? 'dashboard' : entity ? `entity-${entity.id}` : segment
  const title = entity?.label ?? workspace.find((i) => i.id === activeItemId)?.label ?? 'Dashboard'

  const signOut = async () => {
    await createClient().auth.signOut()
    router.replace('/')
  }

  return (
    <div className="h-[100dvh]">
      <DashboardShell
        brand={{ name: 'LexReg', description: isLawyer ? 'Lawyer' : 'Africa', logo: <LexRegLogoMark size={22} /> }}
        navigation={navigation}
        secondaryNavigation={role === 'super_admin' ? [{ id: 'admin', label: 'Admin console', icon: ShieldCheck, href: '/admin' }] : undefined}
        sidebarFooter={
          isLawyer ? undefined : (
            <div className="m-3 flex flex-col gap-2 rounded-lg border border-(--obsidian-dashboard-shell-border) p-3">
              <p className="text-sm font-medium">Legal audit</p>
              <p className="text-xs text-(--obsidian-dashboard-shell-text-muted)">A lawyer-signed report on your records. KES 25,000.</p>
              <Link href="/dashboard/services" className={`${dashboardButtonVariants({ variant: 'primary' })} self-start`}>
                View services
              </Link>
            </div>
          )
        }
        activeItemId={activeItemId}
        title={title}
        linkComponent={Link}
        headerActions={
          <>
          {!isLawyer && (
            <Link href="/onboarding" className={dashboardButtonVariants({ variant: 'secondary' })}>
              <Plus aria-hidden />Add entity
            </Link>
          )}
          <DashboardMenu>
            <DashboardMenuTrigger asChild>
              <button type="button" aria-label={`Account: ${userName}`} className="grid size-[30px] place-items-center rounded-full bg-[#1A1A2E] text-[11px] font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-(--obsidian-dashboard-shell-ring)">
                {initials(userName)}
              </button>
            </DashboardMenuTrigger>
            <DashboardMenuContent align="end">
              <DashboardMenuLabel>
                <span className="block truncate text-sm font-medium">{userName}</span>
                <span className="block truncate text-xs font-normal text-(--obsidian-dashboard-shell-text-muted)">{userEmail}</span>
              </DashboardMenuLabel>
              <DashboardMenuSeparator />
              <DashboardMenuItem onSelect={() => router.push('/dashboard/settings')}><Settings aria-hidden />Settings</DashboardMenuItem>
              <DashboardMenuItem onSelect={signOut}><LogOut aria-hidden />Sign out</DashboardMenuItem>
            </DashboardMenuContent>
          </DashboardMenu>
          </>
        }
      >
        {children}
      </DashboardShell>
    </div>
  )
}
