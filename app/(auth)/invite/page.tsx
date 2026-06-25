import type { Metadata } from 'next'
import { Briefcase } from 'lucide-react'

export const metadata: Metadata = { title: 'Accept invitation' }

export default function InvitePage() {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div
          className="size-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--brand-navy)' }}
        >
          <Briefcase className="size-6 text-white" />
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--brand-navy)' }}>
          You&apos;ve been invited
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Charles has invited you as a legal advisor on LexReg Africa.
        </p>
      </div>

      <p className="text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3">
        Click the link in your invitation email to activate your account and access your assigned entities.
      </p>

      <a
        href="/login"
        className="block text-sm text-muted-foreground hover:underline"
      >
        Already activated? Sign in
      </a>
    </div>
  )
}
