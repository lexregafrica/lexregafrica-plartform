'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, ChevronDown } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type Props = {
  userName: string
  userEmail: string
  avatarUrl?: string | null
}

export function DashboardHeader({ userName, userEmail, avatarUrl }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) { toast.error(error.message); return }
    router.push('/login')
    router.refresh()
  }

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-white shrink-0">
      <div className="text-sm text-muted-foreground">
        <span className="font-medium" style={{ color: 'var(--brand-navy)' }}>LexReg Africa</span>
        <span className="mx-1.5 text-border">·</span>
        Governance OS
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-muted transition-colors"
        >
          <Avatar className="size-7">
            <AvatarImage src={avatarUrl ?? undefined} alt={userName} />
            <AvatarFallback className="text-xs font-semibold" style={{ background: 'var(--brand-navy)', color: 'white' }}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium hidden sm:block max-w-[120px] truncate">{userName}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>

        {open && (
          <div
            className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-border bg-white shadow-lg p-1 z-50"
            onBlur={() => setOpen(false)}
          >
            <div className="px-3 py-2 border-b border-border mb-1">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
