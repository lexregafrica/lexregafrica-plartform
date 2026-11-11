import type { ReactNode } from 'react'
import { SessionGuard } from '@/components/auth/session-guard'
import { OwnerFrame } from '@/components/dashboard/owner-frame'
import { displayUserName, getDashboardSession } from '@/lib/dashboard/session'
import { entityDisplayName, entityTypeColor, fetchOwnerLawyers } from '@/lib/dashboard/owner-data'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { supabase, user, membership, entities } = await getDashboardSession()

  // Not signed in, no organisation, or nothing onboarded yet: the pages
  // redirect or show the resume-onboarding screen, without the frame.
  if (!user || !membership || (!entities.length && membership.role !== 'lawyer')) {
    return (
      <SessionGuard>
        <div className="ios-bg min-h-[100dvh]">{children}</div>
      </SessionGuard>
    )
  }

  const entityIds = entities.map((e) => e.id)
  const [{ count: pending }, { data: assignments }] = await Promise.all([
    supabase.from('compliance_events').select('id', { count: 'exact', head: true }).in('entity_id', entityIds).neq('status', 'complete'),
    membership.role === 'lawyer'
      ? supabase.from('lawyer_assignments').select('entity_id, status').eq('lawyer_user_id', user.id)
      : fetchOwnerLawyers(supabase),
  ])
  const activeAssignments = ((assignments ?? []) as Array<{ entity_id: string; status: string }>).filter(
    (a) => a.status === 'active' && entityIds.includes(a.entity_id),
  ).length

  return (
    <SessionGuard>
      <OwnerFrame
        role={membership.role}
        userName={displayUserName(user)}
        userEmail={user.email ?? ''}
        entities={entities.map((e) => ({ id: e.id, label: entityDisplayName(e), color: entityTypeColor(e.entity_type) }))}
        openMatters={(pending ?? 0) + activeAssignments}
      >
        {children}
      </OwnerFrame>
    </SessionGuard>
  )
}
