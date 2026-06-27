import type { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ios-bg min-h-[100dvh]">
      {children}
    </div>
  )
}
