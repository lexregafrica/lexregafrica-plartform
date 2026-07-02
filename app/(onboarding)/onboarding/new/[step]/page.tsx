import Link from 'next/link'

const TOTAL_STEPS = 9

export default async function NewEntityStep({
  params,
}: {
  params: Promise<{ step: string }>
}) {
  const { step } = await params
  const stepNum = parseInt(step, 10)

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[440px]">
        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{
                background: i < stepNum
                  ? 'var(--brand-navy)'
                  : 'var(--system-fill-3)',
              }}
            />
          ))}
        </div>

        <p className="text-ios-footnote mb-2" style={{ color: 'var(--system-label-3)' }}>
          Step {stepNum} of {TOTAL_STEPS}
        </p>
        <h1 className="text-ios-title1 font-semibold mb-2" style={{ color: 'var(--system-label)' }}>
          New Entity — coming soon
        </h1>
        <p className="text-ios-body" style={{ color: 'var(--system-label-2)' }}>
          This step is being built.
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
