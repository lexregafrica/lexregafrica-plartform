'use client'

import { useState } from 'react'
import { IconGavel, IconFileText, IconDownload, IconAlertTriangle, IconCircleCheck, IconInfoCircle } from '@tabler/icons-react'
import { DashboardShell } from '@/components/dashboard/shell'
import { AgentPlan } from '@/components/spectrumui/blocks/ai-assistants/agent-plan'
import { StatusTracker } from '@/components/spectrumui/blocks/ai-assistants/status-tracker'
import { AgentSteps } from '@/components/spectrumui/blocks/ai-assistants/agent-steps'
import type { ToolCall } from '@/components/spectrumui/blocks/ai-assistants/types'
import { MockBanner, useMockUser } from '@/components/ai-mockups/mock-user'

// LexAudit from the owner's side: what gets checked, live progress while
// the draft is prepared, then the lawyer-signed report. The owner never
// sees an unsigned AI draft.

const STAGES = [
  { id: 'requested', label: 'Requested' },
  { id: 'drafting', label: 'AI draft' },
  { id: 'review', label: 'Lawyer review' },
  { id: 'signed', label: 'Signed' },
  { id: 'delivered', label: 'Delivered' },
]

const PLAN = [
  { id: 'p1', title: 'Registry currency', detail: 'CR12, annual returns and registered office against BRS records on file' },
  { id: 'p2', title: 'Beneficial ownership', detail: 'BO register and BOF-1 filing against the share register' },
  { id: 'p3', title: 'Tax standing', detail: 'KRA PIN and return status' },
  { id: 'p4', title: 'Data protection (DPA 2019)', detail: 'Registration with the ODPC and how personal data is handled' },
  { id: 'p5', title: 'Employment', detail: 'Contracts, statutory deductions and policies on file' },
]

const STEPS: ToolCall[] = [
  { id: 's1', name: 'read_entity_record', status: 'success', args: { entity: 'Amani Logistics Limited' }, result: 'Profile, 4 people, 23 documents' },
  { id: 's2', name: 'check_registry_currency', status: 'success', result: 'Annual return 2025 on file · CR12 dated 11 Jun 2025' },
  {
    id: 's3', name: 'check_beneficial_ownership', status: 'success', parallel: true, children: [
      { id: 's3a', name: 'compare_share_register', status: 'success', result: '3 holders reconciled' },
      { id: 's3b', name: 'find_bof1_filing', status: 'error', result: 'No signed BOF-1 on file' },
    ],
  },
  { id: 's4', name: 'check_data_protection', status: 'running', args: { law: 'Kenya Data Protection Act 2019' } },
  { id: 's5', name: 'check_employment_records', status: 'pending' },
]

const FINDINGS = [
  { tone: 'bad', title: 'BOF-1 not lodged', body: 'The beneficial ownership register lists three owners, but no signed BOF-1 is on file with BRS. Lodge it within 30 days.' },
  { tone: 'warn', title: 'ODPC registration not evidenced', body: 'Amani processes staff and customer data; registration with the Data Commissioner is not on file.' },
  { tone: 'good', title: 'Registry records current', body: 'CR12 and the 2025 annual return match the share and director registers.' },
] as const

type Phase = 'request' | 'progress' | 'delivered'

export function LexAuditMock() {
  const user = useMockUser()
  const [phase, setPhase] = useState<Phase>('request')
  const activeIndex = phase === 'request' ? 0 : phase === 'progress' ? 1 : 4

  return (
    <DashboardShell userName={user.name} userEmail={user.email} isSuperAdmin title="Legal audit">
      <main className="content">
        <MockBanner screen="LexAudit (owner view)" />
        <header className="page-head rise">
          <div className="flex min-w-0 items-center gap-4">
            <span className="icon-tile icon-tile-lg" aria-hidden="true"><IconGavel size={22} stroke={1.75} /></span>
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="t-title1">Legal audit &amp; risk review</h1>
              <p className="t-callout t-2">Amani Logistics Limited · KES 25,000 · signed by a LexReg lawyer</p>
            </div>
          </div>
          <div className="seg" role="radiogroup" aria-label="Mockup state" style={{ '--n': 3, '--i': phase === 'request' ? 0 : phase === 'progress' ? 1 : 2, minWidth: 300 } as React.CSSProperties}>
            {(['request', 'progress', 'delivered'] as Phase[]).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={phase === p} className={phase === p ? 'is-on' : ''} onClick={() => setPhase(p)}>
                {p === 'request' ? 'Request' : p === 'progress' ? 'In progress' : 'Delivered'}
              </button>
            ))}
          </div>
        </header>

        <section className="card card-pad" aria-label="Audit status">
          <StatusTracker
            stages={STAGES}
            activeIndex={activeIndex}
            progress={phase === 'progress' ? 0.6 : undefined}
            detail={phase === 'request' ? 'Choose what the audit covers, then start.' : phase === 'progress' ? 'Drafting from your records — a lawyer reviews before you see anything.' : 'Signed by Adv. Achieng Odhiambo on 8 Nov 2026.'}
            className="max-w-none"
          />
        </section>

        {phase === 'request' && (
          <div key="req" className="enter-forward grid cols-5 keep gap-4">
            <section className="card card-pad span-3" aria-label="Audit scope">
              <AgentPlan
                title="What the audit checks"
                steps={PLAN}
                runLabel="Start my audit"
                onRun={() => setPhase('progress')}
                className="max-w-none"
              />
            </section>
            <aside className="span-2 flex flex-col gap-3">
              <div className="note note-info">
                <IconInfoCircle size={18} stroke={1.75} aria-hidden="true" />
                <p>The draft is prepared from the records already in LexReg, so there&rsquo;s nothing new to upload unless we ask. A lawyer checks and signs every finding before the report reaches you.</p>
              </div>
            </aside>
          </div>
        )}

        {phase === 'progress' && (
          <section key="prog" className="card card-pad enter-forward flex flex-col gap-3" aria-label="Progress">
            <h2 className="t-title3">Preparing your draft</h2>
            <AgentSteps steps={STEPS} className="max-w-none" />
          </section>
        )}

        {phase === 'delivered' && (
          <div key="done" className="enter-forward grid cols-5 keep gap-4">
            <section className="card span-3" aria-labelledby="find-h">
              <div className="card-head"><h2 id="find-h">Key findings</h2><span className="pill pill-warn">2 actions</span></div>
              <div className="flex flex-col pb-1.5">
                {FINDINGS.map((f) => (
                  <div key={f.title} className="list-row" style={{ alignItems: 'flex-start', paddingInline: 20 }}>
                    <span className={`icon-tile ${f.tone}`} aria-hidden="true">
                      {f.tone === 'good' ? <IconCircleCheck size={17} stroke={1.75} /> : <IconAlertTriangle size={17} stroke={1.75} />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="t-subhead" style={{ color: 'var(--label)', fontWeight: 600 }}>{f.title}</span>
                      <span className="t-footnote t-2 t-pretty">{f.body}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <aside className="span-2 flex flex-col gap-4">
              <section className="card card-pad flex flex-col gap-3">
                <span className="icon-tile icon-tile-lg good" aria-hidden="true"><IconFileText size={22} stroke={1.75} /></span>
                <h2 className="t-title3">Audit report</h2>
                <p className="t-footnote t-2">15 pages · signed by Adv. Achieng Odhiambo · 8 Nov 2026</p>
                <button type="button" className="btn btn-primary btn-block"><IconDownload size={17} stroke={1.75} aria-hidden="true" />Download signed report</button>
                <p className="t-footnote t-3">The two actions are now tasks on your compliance calendar.</p>
              </section>
            </aside>
          </div>
        )}
      </main>
    </DashboardShell>
  )
}
