import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, Building2, TrendingUp, ArrowRight, CheckCircle2 } from 'lucide-react'

export const metadata: Metadata = { title: 'Add Entity' }

const PATHS = [
  {
    id: 'existing_entity',
    href: '/onboarding/existing',
    icon: FileText,
    label: 'I have a registered business',
    description: 'Your business is already registered with BRS / eCitizen. Upload your documents and we\'ll extract the details.',
    bullets: ['Upload certificate of incorporation', 'OCR extracts your details automatically', 'Ready in minutes'],
    highlight: true,
  },
  {
    id: 'new_entity',
    href: '/onboarding/new',
    icon: Building2,
    label: 'I want to register a new business',
    description: 'Step-by-step guidance to prepare your company registration documents for submission via eCitizen / BRS.',
    bullets: ['Choose your entity type', 'Collect directors & shareholders', 'Generate information package'],
    highlight: false,
  },
  {
    id: 'informal_business',
    href: '/onboarding/informal',
    icon: TrendingUp,
    label: 'I run an informal business',
    description: 'Not yet registered? We\'ll assess your readiness and create a clear roadmap to formalise your operations.',
    bullets: ['15-question business assessment', 'Readiness score 0–100', 'Personalised gap analysis'],
    highlight: false,
  },
]

export default function OnboardingPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <div>
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground hover:underline mb-4 inline-block"
        >
          ← Back to entities
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-navy)' }}>
          Add a business entity
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the path that best describes your situation
        </p>
      </div>

      <div className="grid gap-4">
        {PATHS.map(({ id, href, icon: Icon, label, description, bullets, highlight }) => (
          <Link
            key={id}
            href={href}
            className={`
              group flex items-start gap-5 rounded-2xl border p-6 transition-all
              ${highlight
                ? 'border-2 bg-white shadow-sm hover:shadow-md'
                : 'border-border bg-white hover:shadow-sm'
              }
            `}
            style={highlight ? { borderColor: 'var(--brand-navy)' } : undefined}
          >
            <div
              className="size-12 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: highlight ? 'var(--brand-navy)' : 'var(--muted)' }}
            >
              <Icon className="size-6" style={{ color: highlight ? 'white' : 'var(--muted-foreground)' }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-semibold text-base" style={{ color: 'var(--brand-navy)' }}>
                  {label}
                </h2>
                {highlight && (
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--brand-gold)', color: 'var(--brand-navy)' }}
                  >
                    Most common
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-3">{description}</p>
              <ul className="space-y-1">
                {bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="size-3.5 shrink-0" style={{ color: 'var(--brand-gold)' }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <ArrowRight
              className="size-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0 mt-0.5"
            />
          </Link>
        ))}
      </div>
    </div>
  )
}
