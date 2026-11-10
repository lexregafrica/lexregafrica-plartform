'use client'

import { IconGavel, IconEyeOff } from '@tabler/icons-react'
import { StreamingText } from '@/components/spectrumui/blocks/ai-assistants/streaming-text'
import { ToolChips } from '@/components/spectrumui/blocks/ai-assistants/tool-chips'
import { AgentPlan } from '@/components/spectrumui/blocks/ai-assistants/agent-plan'
import { LexRegLogoMark } from '@/components/ui/lexreg-logo'
import { MockBanner } from '@/components/ai-mockups/mock-user'

// Lawyer Co-Pilot: an assigned lawyer opens their one entity and gets a
// pre-flight briefing instead of reading raw files cold. Informational
// only — nothing here goes to the client.

const SRC = 'https://app.lexreg.africa'

export function CopilotMock() {
  return (
    <div className="lx min-h-[100dvh]">
      <header className="topbar glass sticky top-0 z-20">
        <span className="flex items-center gap-2"><LexRegLogoMark size={26} /><span className="t-headline">LexReg</span></span>
        <nav className="crumbs" aria-label="Breadcrumb"><span aria-hidden="true">/</span><span className="here">Assigned matter</span></nav>
        <div className="flex-1" />
        <span className="avatar avatar-sm" aria-label="Adv. Achieng Odhiambo">AO</span>
      </header>

      <main className="content mx-auto" style={{ maxWidth: 1100 }}>
        <MockBanner screen="Lawyer Co-Pilot" />
        <div className="note note-brand">
          <IconEyeOff size={18} stroke={1.75} aria-hidden="true" />
          <p>You&rsquo;re viewing one matter: <strong>Legal audit — Amani Logistics Limited</strong>. Nothing else in the client&rsquo;s account is visible to you.</p>
        </div>

        <header className="page-head rise">
          <div className="flex min-w-0 items-center gap-4">
            <span className="icon-tile icon-tile-lg" aria-hidden="true"><IconGavel size={22} stroke={1.75} /></span>
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="t-title1">Amani Logistics Limited</h1>
              <p className="t-callout t-2">Private limited company · PVT-2LU7Q9XB · due 15 Nov 2026</p>
            </div>
          </div>
        </header>

        <div className="grid cols-5 keep gap-4">
          <section className="card card-pad span-3 flex flex-col gap-4" aria-label="Briefing">
            <div className="flex items-center justify-between gap-2">
              <h2 className="t-title3">Pre-flight briefing</h2>
              <span className="pill pill-info">Co-Pilot</span>
            </div>
            <ToolChips calls={[
              { id: 't1', name: 'read_entity_record', status: 'success', result: '4 people · 23 documents' },
              { id: 't2', name: 'diff_required_fields', status: 'success', result: '3 gaps' },
            ]} />
            <StreamingText
              variant="Sources"
              text="The records are in good shape for an audit. **Three gaps** to raise with the client: no **signed BOF-1** on file [1]; **ODPC registration** isn't evidenced [2]; and **Brian Otieno's KRA PIN** differs between the CR12 and his KRA certificate [3]. Registry filings and the share register reconcile."
              citations={[
                { id: 'c1', index: 1, url: `${SRC}/vault`, title: 'Document vault — no BOF-1' },
                { id: 'c2', index: 2, url: `${SRC}/vault`, title: 'Document vault — no ODPC certificate' },
                { id: 'c3', index: 3, url: `${SRC}/people/brian-otieno`, title: 'Brian Otieno — CR12 vs KRA certificate' },
              ]}
              className="max-w-none"
            />
          </section>

          <aside className="card card-pad span-2" aria-label="Suggested checklist">
            <AgentPlan
              variant="Compact"
              title="Suggested audit checklist"
              runLabel="Use this checklist"
              steps={[
                { id: 'a1', title: 'Ask client for the BOF-1 acknowledgement' },
                { id: 'a2', title: 'Request ODPC certificate or plan' },
                { id: 'a3', title: 'Confirm Brian Otieno’s KRA PIN' },
                { id: 'a4', title: 'Review employment contracts on file' },
              ]}
              className="max-w-none"
            />
          </aside>
        </div>
      </main>
    </div>
  )
}
