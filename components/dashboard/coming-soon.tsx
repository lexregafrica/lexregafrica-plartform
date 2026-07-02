'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function DashboardComingSoon() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/')
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6">
      <p className="text-ios-body" style={{ color: 'var(--system-label-2)' }}>
        Dashboard coming soon
      </p>
      <button
        onClick={handleSignOut}
        className="rounded-xl border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      >
        Sign out
      </button>
    </div>
  )
}
