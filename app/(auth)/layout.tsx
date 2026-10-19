import type { ReactNode } from 'react'

// Each auth screen renders its own AuthShell (components/auth/auth-shell)
export default function AuthLayout({ children }: { children: ReactNode }) {
  return children
}
