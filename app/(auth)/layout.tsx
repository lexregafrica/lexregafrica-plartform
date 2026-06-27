import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ios-bg min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12">
      {/* LexReg wordmark */}
      <div className="mb-8 flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[10px]"
            style={{ background: 'var(--brand-navy)' }}
          >
            <span
              className="text-ios-headline font-bold tracking-tight"
              style={{ color: 'var(--brand-gold)', letterSpacing: '-0.5px' }}
            >
              LR
            </span>
          </div>
          <span
            className="text-ios-title2"
            style={{ color: 'var(--brand-navy)', letterSpacing: '-0.5px' }}
          >
            LexReg
          </span>
        </div>
        <span className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>
          Africa
        </span>
      </div>

      {children}
    </div>
  )
}
