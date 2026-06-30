import type { ReactNode } from 'react'
import { SessionGuard } from '@/components/auth/session-guard'

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <SessionGuard>
      <div className="ios-bg min-h-[100dvh]">
        {children}
      </div>
    </SessionGuard>
  )
}
