import type { Metadata } from 'next'
import { SetPasswordForm } from '@/components/auth/set-password-form'

export const metadata: Metadata = {
  title: 'Accept Invitation — LexReg Africa',
}

export default function InviteSetPasswordPage() {
  return <SetPasswordForm mode="invite" />
}
