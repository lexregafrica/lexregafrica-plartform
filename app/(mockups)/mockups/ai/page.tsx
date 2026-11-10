import type { Metadata } from 'next'
import Link from 'next/link'
import { IconMessageCircle, IconGavel, IconShieldCheck, IconBriefcase, IconChartBar, IconArrowRight } from '@tabler/icons-react'
import { LexRegLogoMark } from '@/components/ui/lexreg-logo'

export const metadata: Metadata = { title: 'AI agent mockups — LexReg Africa' }

const SCREENS = [
  { href: '/mockups/ai/ask', icon: IconMessageCircle, who: 'Business owner', title: 'Ask Your Filings', body: 'Plain-language questions about your own company, answered from your records with sources.' },
  { href: '/mockups/ai/audit', icon: IconGavel, who: 'Business owner', title: 'LexAudit', body: 'Request a legal audit, watch the draft being prepared, receive the lawyer-signed report.' },
  { href: '/mockups/ai/review', icon: IconShieldCheck, who: 'Charles · assigned lawyer', title: 'Review & sign-off', body: 'Every AI draft waits here until a person edits, signs and releases it.' },
  { href: '/mockups/ai/copilot', icon: IconBriefcase, who: 'Assigned lawyer', title: 'Lawyer Co-Pilot', body: 'A pre-flight briefing on the one entity a lawyer is assigned to.' },
  { href: '/mockups/ai/activity', icon: IconChartBar, who: 'Charles', title: 'AI activity & costs', body: 'Every agent run, its model, tokens, cost and sign-off status.' },
]

export default function AiMockupsIndex() {
  return (
    <div className="lx min-h-[100dvh]">
      <main className="content mx-auto" style={{ maxWidth: 1100 }}>
        <header className="flex flex-col gap-4 rise">
          <span className="flex items-center gap-2"><LexRegLogoMark size={30} /><span className="sb-word">LexReg<small>Africa</small></span></span>
          <div className="flex flex-col gap-1">
            <p className="t-eyebrow">AI agents · Phase 1 · mockups</p>
            <h1 className="t-large t-balance">What the AI layer looks like</h1>
            <p className="t-body t-2 t-pretty">Sample data only. Every AI output is checked and signed by a lawyer before a client sees it, and agents only read the records the user can already see.</p>
          </div>
        </header>
        <div className="grid cols-3 gap-4">
          {SCREENS.map((s, i) => (
            <Link key={s.href} href={s.href} className="card card-pad card-interactive rise flex flex-col gap-3" style={{ '--d': i + 1, color: 'var(--label)' } as React.CSSProperties}>
              <span className="icon-tile icon-tile-lg" aria-hidden="true"><s.icon size={22} stroke={1.75} /></span>
              <span className="t-eyebrow">{s.who}</span>
              <span className="t-title3">{s.title}</span>
              <span className="t-footnote t-2 t-pretty">{s.body}</span>
              <span className="t-subhead t-brand mt-auto flex items-center gap-1">Open<IconArrowRight size={15} stroke={2} aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
