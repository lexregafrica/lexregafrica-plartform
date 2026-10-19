import type { Metadata } from 'next'
import { SetPasswordForm } from '@/components/auth/set-password-form'

export const metadata: Metadata = {
  title: 'Choose a New Password — LexReg Africa',
}

export default function ResetPasswordPage() {
  return <SetPasswordForm mode="reset" />
}
