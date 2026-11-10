'use client'

import { useState } from 'react'
import { IconRobot, IconFileText } from '@tabler/icons-react'
import { AdminShell } from '@/components/admin/admin-shell'
import { ApprovalCard } from '@/components/spectrumui/blocks/ai-assistants/approval-card'
import { DiffView } from '@/components/spectrumui/blocks/ai-assistants/diff-view'
import { ReasoningTrace } from '@/components/spectrumui/blocks/ai-assistants/reasoning-trace'
import { CitationSources } from '@/components/spectrumui/blocks/ai-assistants/citation-sources'
import { MockBanner, useMockUser } from '@/components/ai-mockups/mock-user'

// The approval gate every AI output passes through (proposal §4–5):
// Charles or the assigned lawyer reviews the draft, edits it, then signs
// and releases it. Nothing reaches a client before this.

const QUEUE = [
  { id: 'd1', agent: 'LexAudit', entity: 'Amani Logistics Limited', item: 'Legal audit report — 15 pages', waiting: '2 h', reviewer: 'Adv. Achieng Odhiambo' },
  { id: 'd2', agent: 'Drafting', entity: 'Kilele Partners', item: 'Board resolution — change of bank signatories', waiting: '1 d', reviewer: 'Charles' },
  { id: 'd3', agent: 'LexAudit', entity: 'Tumaini Welfare Society', item: 'Legal audit report — 11 pages', waiting: '3 d', reviewer: 'Unassigned' },
]

const SRC = 'https://app.lexreg.africa'

export function ReviewQueueMock() {
  const user = useMockUser()
  const [selected, setSelected] = useState('d1')
  const current = QUEUE.find((q) => q.id === selected)!

  return (
    <AdminShell userName={user.name} userEmail={user.email}>
      <main className="content">
        <MockBanner screen="AI review queue" />
        <header className="page-head rise">
          <div className="flex flex-col gap-1">
            <h1 className="t-title1">Awaiting sign-off</h1>
            <p className="t-callout t-2">AI drafts reach a client only after you or the assigned lawyer approve them.</p>
          </div>
          <span className="pill pill-warn t-num">{QUEUE.length} waiting</span>
        </header>

        <section className="card" aria-label="Drafts awaiting review">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th scope="col">Draft</th><th scope="col">Agent</th><th scope="col">Reviewer</th><th scope="col" className="num">Waiting</th></tr></thead>
              <tbody>
                {QUEUE.map((q) => (
                  <tr key={q.id} style={selected === q.id ? { background: 'var(--brand-50)' } : undefined}>
                    <td>
                      <button type="button" onClick={() => setSelected(q.id)} className="flex flex-col text-left" aria-pressed={selected === q.id}>
                        <span className="t-subhead" style={{ color: 'var(--label)', fontWeight: 600 }}>{q.item}</span>
                        <span className="t-footnote t-3">{q.entity}</span>
                      </button>
                    </td>
                    <td><span className="pill pill-info"><IconRobot size={13} stroke={1.75} aria-hidden="true" />{q.agent}</span></td>
                    <td className={q.reviewer === 'Unassigned' ? 't-warn' : 't-2'}>{q.reviewer}</td>
                    <td className="num t-3 whitespace-nowrap">{q.waiting}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div key={selected} className="fade grid cols-5 keep gap-4">
          <div className="span-3 flex flex-col gap-4">
            <section className="card card-pad flex flex-col gap-3" aria-label="Finding under review">
              <div className="flex items-center gap-2">
                <IconFileText size={18} stroke={1.75} aria-hidden="true" style={{ color: 'var(--label-3)' }} />
                <h2 className="t-title3">Finding 1 of 6 — Beneficial ownership</h2>
              </div>
              <CitationSources
                variant="Footnotes"
                text="The register of beneficial owners lists Wanjiku Mwangi, Brian Otieno and James Kariuki [1], but no signed BOF-1 has been lodged with the Registrar [2]. Changes to beneficial ownership must be lodged with the Registrar."
                citations={[
                  { id: 'c1', index: 1, url: `${SRC}/register/beneficial-owners`, title: 'Beneficial ownership register' },
                  { id: 'c2', index: 2, url: `${SRC}/vault`, title: 'Document vault — no BOF-1 found' },
                ]}
                className="max-w-none"
              />
              <ReasoningTrace
                status="complete"
                durationMs={8400}
                steps={[
                  { id: 'r1', content: 'Share register shows Savannah Holdings at 10% — at the 10% threshold, so its owner is a beneficial owner.' },
                  { id: 'r2', content: 'Searched the vault for a signed BOF-1 or a BRS acknowledgement: none found.' },
                  { id: 'r3', content: 'Flagged as an action, not a breach — the lodgement date cannot be confirmed from records alone.' },
                ]}
                className="max-w-none"
              />
            </section>

            <section className="card card-pad flex flex-col gap-3" aria-label="Lawyer edits">
              <h2 className="t-title3">Your edits to the draft</h2>
              <DiffView
                diffs={[{
                  id: 'e1', path: 'Finding 1 — recommendation', additions: 2, deletions: 1,
                  lines: [
                    { type: 'context', text: 'Recommendation:' },
                    { type: 'remove', text: 'File the BOF-1 as soon as possible.' },
                    { type: 'add', text: 'Lodge the BOF-1 on BRS eCitizen within 14 days and upload the acknowledgement to LexReg.' },
                    { type: 'add', text: 'LexReg will prepare the form from the register for signature.' },
                  ],
                }]}
                className="max-w-none"
              />
            </section>
          </div>

          <aside className="span-2 flex flex-col gap-4">
            <ApprovalCard
              title={`Sign and release to ${current.entity}?`}
              description={`${current.item}. Your name and today's date go on the report, and the client is notified. You can't edit it after release.`}
              meta={`drafted by ${current.agent} · reviewed by ${current.reviewer}`}
              approveLabel="Sign & release"
              rejectLabel="Send back for redraft"
              className="max-w-none"
            />
            <div className="note note-info">
              <IconRobot size={18} stroke={1.75} aria-hidden="true" />
              <p>Every draft, edit and sign-off is written to the audit log with who did it and when.</p>
            </div>
          </aside>
        </div>
      </main>
    </AdminShell>
  )
}
