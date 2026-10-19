import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/supabase/require-super-admin'
import { SessionGuard } from '@/components/auth/session-guard'
import { AdminShell } from '@/components/admin/admin-shell'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin } = await requireSuperAdmin()
  if (!user) redirect('/login')
  if (!isSuperAdmin) redirect('/dashboard')

  const userName = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Admin'

  return (
    <SessionGuard>
      <AdminShell userName={userName} userEmail={user.email ?? ''}>{children}</AdminShell>
    </SessionGuard>
  )
}
