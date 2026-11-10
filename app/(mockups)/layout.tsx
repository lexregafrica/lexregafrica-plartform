import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { requireSuperAdmin } from '@/lib/supabase/require-super-admin'
import { SessionGuard } from '@/components/auth/session-guard'
import { MockUserProvider } from '@/components/ai-mockups/mock-user'

// AI agent mockups (Phase 1 of the AI proposal) — sample data only, no
// model calls, nothing saved. Super-admin only so they never reach clients.
export default async function MockupsLayout({ children }: { children: ReactNode }) {
  const { user, isSuperAdmin } = await requireSuperAdmin()
  if (!user) redirect('/login')
  if (!isSuperAdmin) redirect('/dashboard')

  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Admin'
  return (
    <SessionGuard>
      <MockUserProvider value={{ name, email: user.email ?? '' }}>{children}</MockUserProvider>
    </SessionGuard>
  )
}
