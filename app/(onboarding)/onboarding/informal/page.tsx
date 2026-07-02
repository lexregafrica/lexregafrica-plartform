import Link from 'next/link'

export default function InformalBusinessPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        <h1 className="text-ios-title1 font-semibold mb-2" style={{ color: 'var(--system-label)' }}>
          Readiness Assessment — coming soon
        </h1>
        <p className="text-ios-body" style={{ color: 'var(--system-label-2)' }}>
          15-question assessment being built.
        </p>

        <Link
          href="/onboarding"
          className="mt-8 inline-flex text-ios-subhead font-medium"
          style={{ color: 'var(--brand-navy)' }}
        >
          ← Back to path selection
        </Link>
      </div>
    </div>
  )
}
