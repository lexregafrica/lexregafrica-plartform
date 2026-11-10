'use client'

import { IconRobot, IconCoin, IconClock, IconShieldCheck } from '@tabler/icons-react'
import { AdminShell } from '@/components/admin/admin-shell'
import { RecentActivity } from '@/components/spectrumui/recent-activity'
import { UsageMeter } from '@/components/spectrumui/blocks/ai-assistants/usage-meter'
import { MockBanner, useMockUser } from '@/components/ai-mockups/mock-user'

// Charles's lens on the agent layer: every run, its model, tokens, cost
// and outcome — read from the same audit trail as the rest of the app.

const RUNS = [
  { agent: 'Ask Your Filings', entity: 'Amani Logistics Limited', model: 'gpt-oss-120b (Groq)', tokens: 3_412, outcome: 'Answered', tone: 'good', when: '12 min ago' },
  { agent: 'LexAudit', entity: 'Amani Logistics Limited', model: 'gpt-oss-120b (Groq)', tokens: 61_880, outcome: 'Awaiting sign-off', tone: 'warn', when: '2 h ago' },
  { agent: 'Lawyer Co-Pilot', entity: 'Amani Logistics Limited', model: 'llama-3.3-70b (Groq)', tokens: 8_204, outcome: 'Briefing shown', tone: 'good', when: '3 h ago' },
  { agent: 'LexAudit', entity: 'Tumaini Welfare Society', model: 'gpt-oss-120b (Groq)', tokens: 44_105, outcome: 'Awaiting sign-off', tone: 'warn', when: '3 d ago' },
  { agent: 'Ask Your Filings', entity: 'Kilele Partners', model: 'gpt-oss-120b (Groq)', tokens: 0, outcome: 'Fell back to Gemini', tone: 'info', when: '4 d ago' },
] as const

export function AiActivityMock() {
  const user = useMockUser()
  return (
    <AdminShell userName={user.name} userEmail={user.email}>
      <main className="content">
        <MockBanner screen="AI activity and costs" />
        <header className="page-head rise">
          <div className="flex flex-col gap-1">
            <h1 className="t-title1">AI activity</h1>
            <p className="t-callout t-2">Every agent run, its cost, and whether a person has signed it off.</p>
          </div>
        </header>

        <section className="grid cols-4 keep-2 gap-4" aria-label="Summary">
          {[
            { label: 'Runs this month', value: '128', sub: '4 agents', icon: IconRobot },
            { label: 'Awaiting sign-off', value: '2', sub: 'Oldest 3 days', icon: IconClock },
            { label: 'Released to clients', value: '5', sub: 'All lawyer-signed', icon: IconShieldCheck },
            { label: 'Model cost', value: 'KES 0', sub: 'Groq free tier · within limits', icon: IconCoin },
          ].map((s, i) => (
            <div key={s.label} className="stat rise" style={{ '--d': i + 1 } as React.CSSProperties}>
              <p className="stat-label"><s.icon size={15} stroke={1.75} aria-hidden="true" />{s.label}</p>
              <p className="t-stat">{s.value}</p>
              <p className="stat-sub">{s.sub}</p>
            </div>
          ))}
        </section>

        <div className="grid cols-5 keep gap-4">
          <section className="card span-3" aria-labelledby="runs-h">
            <div className="card-head"><h2 id="runs-h">Recent runs</h2></div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th scope="col">Agent</th><th scope="col">Model</th><th scope="col" className="num">Tokens</th><th scope="col">Outcome</th></tr></thead>
                <tbody>
                  {RUNS.map((r, i) => (
                    <tr key={i}>
                      <td><span className="flex flex-col"><span className="t-subhead" style={{ color: 'var(--label)', fontWeight: 600 }}>{r.agent}</span><span className="t-footnote t-3">{r.entity} · {r.when}</span></span></td>
                      <td className="t-2 t-footnote">{r.model}</td>
                      <td className="num">{r.tokens.toLocaleString()}</td>
                      <td><span className={`pill pill-${r.tone}`}>{r.outcome}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="span-2 flex flex-col gap-4">
            <section className="card card-pad flex flex-col gap-3" aria-label="Largest run">
              <h2 className="t-title3">Largest run this week</h2>
              <p className="t-footnote t-3">LexAudit · Amani Logistics Limited</p>
              <UsageMeter usage={{ promptTokens: 54_210, completionTokens: 7_670, contextWindow: 131_072, estimatedCostUsd: 0 }} className="max-w-none" />
            </section>
            <RecentActivity
              title="Agent timeline"
              items={[
                { title: 'LexAudit draft ready', description: 'Amani Logistics Limited — sent to Adv. Achieng Odhiambo', duration: '3m 12s', timeAgo: '2h' },
                { title: 'Report signed & released', description: 'Mwangi Kariuki & Associates LLP', duration: '—', timeAgo: '1d' },
                { title: 'Groq unavailable, used Gemini', description: 'Ask Your Filings · Kilele Partners', duration: '9s', timeAgo: '4d' },
              ]}
              className="max-w-none"
            />
          </aside>
        </div>
      </main>
    </AdminShell>
  )
}
