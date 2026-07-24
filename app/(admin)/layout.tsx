import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/supabase/require-super-admin'
import { SessionGuard } from '@/components/auth/session-guard'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin } = await requireSuperAdmin()
  if (!user) redirect('/login')
  if (!isSuperAdmin) redirect('/dashboard')

  return (
    <SessionGuard>
      <div className="ios-bg min-h-[100dvh]">{children}</div>
    </SessionGuard>
  )
}
