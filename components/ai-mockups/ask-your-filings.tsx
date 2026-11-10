'use client'

import { useEffect, useRef, useState } from 'react'
import { IconBuilding, IconLock } from '@tabler/icons-react'
import { DashboardShell } from '@/components/dashboard/shell'
import { ChatEmptyState } from '@/components/spectrumui/blocks/ai-assistants/chat-empty-state'
import { StreamingText } from '@/components/spectrumui/blocks/ai-assistants/streaming-text'
import { ToolChips } from '@/components/spectrumui/blocks/ai-assistants/tool-chips'
import { PromptComposer } from '@/components/spectrumui/blocks/ai-assistants/prompt-composer'
import { MemoryChips } from '@/components/spectrumui/blocks/ai-assistants/memory-chips'
import type { Citation, SuggestedPrompt, ToolCall } from '@/components/spectrumui/blocks/ai-assistants/types'
import { MockBanner, useMockUser } from '@/components/ai-mockups/mock-user'

// Ask Your Filings — read-only Q&A over the owner's own entity records.
// Every answer cites the record it came from; nothing is written back.

type Scripted = { answer: string; tools: ToolCall[]; citations: Citation[]; followUps: SuggestedPrompt[] }

const SRC = 'https://app.lexreg.africa'
const SCRIPTS: Record<string, Scripted> = {
  owners: {
    answer: 'Amani Logistics Limited has **three shareholders**: Wanjiku Mwangi holds **600 shares (60%)**, Brian Otieno **300 shares (30%)** and Savannah Holdings Limited **100 shares (10%)** [1]. Savannah Holdings is owned by James Kariuki, so he is a **beneficial owner** through it [2].',
    tools: [
      { id: 't1', name: 'read_share_register', status: 'success', args: { entity: 'Amani Logistics Limited' }, result: '3 holders · 1,000 ordinary shares' },
      { id: 't2', name: 'read_beneficial_owners', status: 'success', args: { entity: 'Amani Logistics Limited' }, result: '3 beneficial owners' },
    ],
    citations: [
      { id: 'c1', index: 1, url: `${SRC}/register/shares`, title: 'Share register — from CR12, 11 Jun 2025' },
      { id: 'c2', index: 2, url: `${SRC}/register/beneficial-owners`, title: 'Beneficial ownership register' },
    ],
    followUps: [
      { id: 'f1', label: 'When was the share register last updated?' },
      { id: 'f2', label: 'Do we need to file a new BOF-1?' },
    ],
  },
  deadline: {
    answer: 'Your next filing is the **annual return, due 13 April 2027** — within 30 days of the incorporation anniversary [1]. The **Nairobi County business permit** renews on **31 March 2027** [2]. Nothing is overdue right now.',
    tools: [{ id: 't1', name: 'read_compliance_calendar', status: 'success', args: { entity: 'Amani Logistics Limited', window: 'next 180 days' }, result: '2 upcoming · 0 overdue' }],
    citations: [
      { id: 'c1', index: 1, url: `${SRC}/compliance/annual-return`, title: 'Compliance calendar — Annual return' },
      { id: 'c2', index: 2, url: `${SRC}/compliance/county-permit`, title: 'Compliance calendar — County business permit' },
    ],
    followUps: [{ id: 'f1', label: 'What do we need to file the annual return?' }],
  },
  capital: {
    answer: 'Your **nominal share capital is KES 1,000,000**, divided into **1,000 ordinary shares of KES 1,000 each** [1]. All 1,000 shares are issued [2].',
    tools: [{ id: 't1', name: 'read_entity_details', status: 'success', args: { fields: ['nominal_capital', 'share_classes'] }, result: 'KES 1,000,000 · 1 class' }],
    citations: [
      { id: 'c1', index: 1, url: `${SRC}/vault/certificate`, title: 'Certificate of incorporation, 14 Mar 2019' },
      { id: 'c2', index: 2, url: `${SRC}/register/shares`, title: 'Share register — from CR12, 11 Jun 2025' },
    ],
    followUps: [{ id: 'f1', label: 'Who are our directors?' }],
  },
}

const PROMPTS: SuggestedPrompt[] = [
  { id: 'owners', label: 'Who owns Amani Logistics?' },
  { id: 'deadline', label: 'What do we need to file next?' },
  { id: 'capital', label: 'What is our authorised share capital?' },
]

type Turn = { id: string; question: string; key: string }

export function AskYourFilingsMock() {
  const user = useMockUser()
  const [turns, setTurns] = useState<Turn[]>([])
  const [shown, setShown] = useState(0) // characters revealed of the latest answer
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const latest = turns[turns.length - 1]
  const latestText = latest ? SCRIPTS[latest.key].answer : ''
  const streaming = !!latest && shown < latestText.length

  useEffect(() => {
    if (!latest) return
    timer.current = setInterval(() => setShown((n) => (n >= latestText.length ? n : n + 6)), 16)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [latest, latestText.length])

  const ask = (key: string, question: string) => {
    setShown(0)
    setTurns((t) => [...t, { id: `${Date.now()}`, question, key }])
  }
  const askFree = (text: string) => {
    const t = text.toLowerCase()
    const key = /own|sharehold|beneficial/.test(t) ? 'owners' : /due|file|deadline|next/.test(t) ? 'deadline' : 'capital'
    ask(key, text)
  }

  return (
    <DashboardShell userName={user.name} userEmail={user.email} isSuperAdmin title="Ask your filings">
      <main className="content">
        <MockBanner screen="Ask Your Filings" />
        <header className="page-head rise">
          <div className="flex min-w-0 items-center gap-4">
            <span className="icon-tile icon-tile-lg" aria-hidden="true"><IconBuilding size={22} stroke={1.75} /></span>
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="t-title1">Ask your filings</h1>
              <p className="t-callout t-2">Amani Logistics Limited · answers come only from this entity&rsquo;s own records</p>
            </div>
          </div>
        </header>

        <div className="grid cols-5 keep gap-4">
          <section className="card card-pad span-3 flex min-h-[520px] flex-col gap-5" aria-label="Conversation">
            {turns.length === 0 ? (
              <div className="flex flex-1 items-center justify-center">
                <ChatEmptyState
                  variant="Centered"
                  title="Ask anything about Amani Logistics"
                  subtitle="Owners, directors, deadlines, capital — answered from your registers and documents, with sources."
                  prompts={PROMPTS}
                  onSelectPrompt={(p) => ask(p.id, p.label)}
                />
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-6">
                {turns.map((turn, i) => {
                  const s = SCRIPTS[turn.key]
                  const isLatest = i === turns.length - 1
                  return (
                    <div key={turn.id} className="flex flex-col gap-3">
                      <p className="t-callout self-end rounded-2xl px-4 py-2" style={{ background: 'var(--brand-50)', color: 'var(--label)', maxWidth: '80%' }}>{turn.question}</p>
                      <ToolChips calls={s.tools} />
                      <StreamingText
                        text={isLatest ? s.answer.slice(0, shown) : s.answer}
                        streaming={isLatest && streaming}
                        citations={s.citations}
                        variant="Sources"
                        followUps={isLatest ? s.followUps : []}
                        onFollowUp={(p) => askFree(p.label)}
                        className="max-w-none"
                      />
                    </div>
                  )
                })}
              </div>
            )}
            <PromptComposer
              placeholder="Ask about your company…"
              models={[{ id: 'groq-oss', name: 'GPT-OSS 120B', description: 'Groq · default' }, { id: 'groq-llama', name: 'Llama 3.3 70B', description: 'Groq · fast' }]}
              defaultModelId="groq-oss"
              onSend={(text) => text.trim() && askFree(text)}
              isGenerating={streaming}
              onStop={() => setShown(latestText.length)}
            />
          </section>

          <aside className="span-2 flex flex-col gap-4">
            <section className="card card-pad flex flex-col gap-3" aria-label="What the assistant can see">
              <span className="icon-tile" aria-hidden="true"><IconLock size={18} stroke={1.75} /></span>
              <h2 className="t-title3">Only your records</h2>
              <p className="t-footnote t-2 t-pretty">The assistant reads Amani Logistics&rsquo; registers, documents and compliance calendar — the same data you can see. It can&rsquo;t change anything, and it can&rsquo;t see any other company.</p>
            </section>
            <MemoryChips
              title="Remembered for this entity"
              memories={[
                { id: 'm1', fact: 'Financial year ends 31 December' },
                { id: 'm2', fact: 'Brian Otieno handles KRA filings' },
                { id: 'm3', fact: 'Prefers email over WhatsApp' },
              ]}
            />
          </aside>
        </div>
      </main>
    </DashboardShell>
  )
}
