import type { Metadata } from 'next'
import Link from 'next/link'
import type { SupabaseClient } from '@supabase/supabase-js'
import { IconRobot, IconClock, IconShieldCheck, IconAlertTriangle } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/server'
import { AI_MODELS, DAILY_RUN_CAP, aiEnabled } from '@/lib/ai/provider'

export const metadata: Metadata = { title: 'AI activity — LexReg Admin' }

// Charles's view of the agent layer, read from ai_runs and ai_drafts.
// Groq free tier: cost is KES 0 while within limits.

const AGENT_LABEL: Record<string, string> = { ask_filings: 'Ask Your Filings', lex_audit: 'LexAudit', copilot: 'Lawyer Co-Pilot' }
const TONE: Record<string, string> = { succeeded: 'good', failed: 'bad', running: 'info', blocked: 'warn' }

type Run = { id: string; agent: string; model: string; status: string; input_tokens: number; output_tokens: number; created_at: string; error: string | null; entity_id: string | null; entities: { legal_name: string | null; trading_name: string | null } | null }

const when = (iso: string) => new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Nairobi' })

export default async function AdminAiActivityPage() {
  const supabase = (await createClient()) as unknown as SupabaseClient
  const monthStart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date()).slice(0, 8) + '01'

  const [{ data: runs }, { data: monthRuns }, { count: waiting }, { count: released }] = await Promise.all([
    supabase.from('ai_runs').select('id, agent, model, status, input_tokens, output_tokens, created_at, error, entity_id, entities(legal_name, trading_name)').order('created_at', { ascending: false }).limit(50),
    supabase.from('ai_runs').select('agent, status, input_tokens, output_tokens').gte('created_at', `${monthStart}T00:00:00+03:00`),
    supabase.from('ai_drafts').select('id', { count: 'exact', head: true }).in('status', ['draft', 'in_review']).is('deleted_at', null),
    supabase.from('ai_drafts').select('id', { count: 'exact', head: true }).eq('status', 'released').is('deleted_at', null),
  ])

  const month = (monthRuns ?? []) as Array<{ agent: string; status: string; input_tokens: number; output_tokens: number }>
  const tokens = month.reduce((a, r) => a + r.input_tokens + r.output_tokens, 0)
  const failed = month.filter((r) => r.status === 'failed').length
  const byAgent = Object.entries(AGENT_LABEL).map(([id, label]) => ({ label, count: month.filter((r) => r.agent === id).length }))

  const stats = [
    { label: 'Runs this month', value: month.length.toLocaleString(), sub: byAgent.map((a) => `${a.label} ${a.count}`).join(' · '), icon: IconRobot },
    { label: 'Awaiting sign-off', value: String(waiting ?? 0), sub: 'LexAudit drafts in review', icon: IconClock },
    { label: 'Released to clients', value: String(released ?? 0), sub: 'All lawyer-signed', icon: IconShieldCheck },
    { label: 'Tokens this month', value: tokens.toLocaleString(), sub: `${failed} failed run${failed === 1 ? '' : 's'} · Groq free tier, KES 0`, icon: IconAlertTriangle },
  ]

  return (
    <main className="content">
      <header className="page-head rise">
        <div className="flex flex-col gap-1">
          <h1 className="t-title1">AI activity</h1>
          <p className="t-callout t-2">Every agent run, its model and tokens, and what is waiting for a lawyer&rsquo;s signature.</p>
        </div>
        <span className={`pill ${aiEnabled() ? 'pill-good' : 'pill-bad'}`}>{aiEnabled() ? `On · ${AI_MODELS.primary} · cap ${DAILY_RUN_CAP}/org/day` : 'Switched off'}</span>
      </header>

      <section className="grid cols-4 keep-2 gap-4" aria-label="Summary">
        {stats.map((s, i) => (
          <div key={s.label} className="stat rise" style={{ '--d': i + 1 } as React.CSSProperties}>
            <p className="stat-label"><s.icon size={15} stroke={1.75} aria-hidden="true" />{s.label}</p>
            <p className="t-stat">{s.value}</p>
            <p className="stat-sub">{s.sub}</p>
          </div>
        ))}
      </section>

      <section className="card" aria-labelledby="runs-h">
        <div className="card-head">
          <h2 id="runs-h">Recent runs</h2>
          <Link href="/admin/reviews" className="t-footnote t-brand">Review queue</Link>
        </div>
        {(runs ?? []).length === 0 ? (
          <p className="t-footnote t-3 px-5 pb-5">No AI runs yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th scope="col">Agent</th><th scope="col">Model</th><th scope="col" className="num">Tokens</th><th scope="col">Outcome</th></tr></thead>
              <tbody>
                {((runs ?? []) as unknown as Run[]).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="flex flex-col">
                        <span className="t-subhead" style={{ color: 'var(--label)', fontWeight: 600 }}>{AGENT_LABEL[r.agent] ?? r.agent}</span>
                        <span className="t-footnote t-3">
                          {r.entity_id ? <Link href={`/admin/entities/${r.entity_id}`}>{r.entities?.legal_name || r.entities?.trading_name || 'Entity'}</Link> : 'Organisation'} · {when(r.created_at)}
                        </span>
                      </span>
                    </td>
                    <td className="t-2 t-footnote">{r.model}</td>
                    <td className="num">{(r.input_tokens + r.output_tokens).toLocaleString()}</td>
                    <td><span className={`pill pill-${TONE[r.status] ?? 'info'}`} title={r.error ?? undefined}>{r.status === 'succeeded' ? 'Answered' : r.status === 'failed' ? 'Failed' : r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
