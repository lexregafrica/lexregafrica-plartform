'use client'

import { useState } from 'react'
import Link from 'next/link'
import { IconBuilding, IconFileText, IconGavel, IconArrowRight, IconCheck, IconMessageCircle, IconInfoCircle } from '@tabler/icons-react'
import { DashboardShell } from '@/components/dashboard/shell'
import { HelpRequestSheet } from '@/components/onboarding/help-request-sheet'

export type ServiceEntity = { id: string; name: string }

// The three paid pillars (CLAUDE.md). Payments aren't wired yet, so a
// request goes to the team through the existing help channel (email
// first, WhatsApp as the alternative) and pricing is confirmed there.
const SERVICES = [
  {
    id: 'formation',
    icon: IconBuilding,
    title: 'Entity formation & registration',
    summary: 'Register a company, partnership, business name, society or trust. We collect everything once and prepare your filing pack; you file on BRS eCitizen with our guidance.',
    includes: ['Guided questionnaire for every entity type', 'Filing pack with the forms BRS needs', 'Certificate upload and activation'],
    price: 'Government (BRS) fees apply',
    priceSub: 'Paid to BRS on eCitizen',
  },
  {
    id: 'corporate',
    icon: IconFileText,
    title: 'Corporate services',
    summary: 'Minutes, notices, resolutions and statutory filings prepared by a LexReg lawyer, kept with the rest of your records.',
    includes: ['Board and shareholder minutes', 'Notices and written resolutions', 'Statutory filings and register updates'],
    price: 'Quoted per matter',
    priceSub: 'Confirmed before any work starts',
  },
  {
    id: 'audit',
    icon: IconGavel,
    title: 'Legal audit & risk review',
    summary: 'A full compliance health check across statutory, tax, employment and data protection, with a written report from a LexReg lawyer.',
    includes: ['Statutory and registry compliance', 'Tax, employment and data protection', 'Written report with priority actions'],
    price: 'KES 25,000',
    priceSub: 'One-time, per entity',
  },
] as const

export function ServicesPage({ userName, userEmail, isSuperAdmin, entities }: {
  userName: string
  userEmail: string
  isSuperAdmin?: boolean
  entities: ServiceEntity[]
}) {
  const [entityId, setEntityId] = useState(entities[0]?.id ?? '')
  const [requesting, setRequesting] = useState<(typeof SERVICES)[number] | null>(null)
  const entityName = entities.find((e) => e.id === entityId)?.name ?? null

  return (
    <DashboardShell userName={userName} userEmail={userEmail} isSuperAdmin={isSuperAdmin} title="Services">
      <main className="content">
        <header className="page-head rise">
          <div className="flex flex-col gap-1">
            <h1 className="t-title1">Services</h1>
            <p className="t-callout t-2 t-pretty">Work a LexReg lawyer does for you, alongside everything you manage yourself.</p>
          </div>
          {entities.length > 0 && (
            <div className="field" style={{ minWidth: 240 }}>
              <label className="label" htmlFor="svc-entity">For which entity?</label>
              <select id="svc-entity" className="select" value={entityId} onChange={(e) => setEntityId(e.target.value)}>
                {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          )}
        </header>

        <section className="grid cols-3 gap-4" aria-label="Services">
          {SERVICES.map((s, i) => (
            <article key={s.id} className="card card-pad rise flex flex-col gap-4" style={{ '--d': i + 1 } as React.CSSProperties} aria-labelledby={`svc-${s.id}`}>
              <span className="icon-tile icon-tile-lg" aria-hidden="true"><s.icon size={22} stroke={1.75} /></span>
              <div className="flex flex-col gap-1.5">
                <h2 id={`svc-${s.id}`} className="t-title3">{s.title}</h2>
                <p className="t-callout t-2 t-pretty">{s.summary}</p>
              </div>
              <ul className="flex flex-col gap-2">
                {s.includes.map((line) => (
                  <li key={line} className="t-footnote flex items-start gap-2" style={{ color: 'var(--label)' }}>
                    <IconCheck size={15} stroke={2} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--good)' }} />{line}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-col gap-0.5 pt-3" style={{ borderTop: 'var(--hairline-soft)' }}>
                <p className={s.id === 'audit' ? 't-stat' : 't-headline'}>{s.price}</p>
                <p className="t-footnote t-3">{s.priceSub}</p>
              </div>
              {s.id === 'formation' ? (
                <div className="flex flex-col gap-2">
                  <Link href="/onboarding" className="btn btn-primary btn-block">Start a registration<IconArrowRight size={17} stroke={2} aria-hidden="true" /></Link>
                  <button type="button" onClick={() => setRequesting(s)} className="btn btn-plain btn-block">Ask a question first</button>
                </div>
              ) : (
                <button type="button" onClick={() => setRequesting(s)} className={`btn btn-block ${s.id === 'audit' ? 'btn-primary' : 'btn-tinted'}`}>
                  <IconMessageCircle size={17} stroke={1.75} aria-hidden="true" />{s.id === 'audit' ? 'Book a legal audit' : 'Request corporate services'}
                </button>
              )}
            </article>
          ))}
        </section>

        <div className="note note-info">
          <IconInfoCircle size={18} stroke={1.75} aria-hidden="true" />
          <p>Requests go straight to our team by email or WhatsApp. We confirm the scope and price with you before any work starts.</p>
        </div>
      </main>

      {requesting && (
        <HelpRequestSheet
          context={{ source: `Service request — ${requesting.title}`, businessName: entityName }}
          defaultName={userName}
          defaultEmail={userEmail}
          onClose={() => setRequesting(null)}
        />
      )}
    </DashboardShell>
  )
}
