import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  const { data: membership } = await supabase
    .from('organisation_members')
    .select('role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  const isAdmin = membership?.role === 'super_admin'
  const userName = profile?.full_name ?? user.email?.split('@')[0] ?? 'User'

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <Sidebar isAdmin={isAdmin} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          userName={userName}
          userEmail={user.email ?? ''}
          avatarUrl={profile?.avatar_url}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      <Toaster />
    </div>
  )
}
