export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left brand panel — hidden on mobile */}
      <div
        className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between p-12 shrink-0"
        style={{ background: 'var(--brand-navy)' }}
      >
        <div className="flex items-center gap-3">
          <LogoMark />
          <span className="text-white font-semibold text-lg tracking-tight">LexReg Africa</span>
        </div>

        <div>
          <blockquote className="text-white/80 text-lg leading-relaxed mb-6">
            "Compliance is not a burden — it&apos;s the foundation every sustainable Kenyan business builds on."
          </blockquote>
          <p className="text-white/40 text-sm">Charles M. — Legal Partner</p>
        </div>

        <p className="text-white/30 text-xs">
          Governance, Compliance & Organisational Readiness OS
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <LogoMark />
            <span className="font-semibold text-base tracking-tight" style={{ color: 'var(--brand-navy)' }}>
              LexReg Africa
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

function LogoMark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="var(--brand-gold, #c9a227)" />
      <path
        d="M8 8h4v12h8v4H8V8zM18 8h6l-4 8 4 8h-6l-4-8 4-8z"
        fill="var(--brand-navy, #1a1a2e)"
      />
    </svg>
  )
}
