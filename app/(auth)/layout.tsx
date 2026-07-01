import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ios-bg min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12">
      {/* LexReg wordmark */}
      <div className="mb-8 flex flex-col items-center gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo.png" alt="LexReg Africa" className="h-14 w-14 object-contain" />
      </div>

      {children}
    </div>
  )
}
