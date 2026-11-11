'use client'

import { useState } from 'react'
import { IconSparkles, IconEyeOff } from '@tabler/icons-react'

// Pre-flight briefing card for the assigned lawyer on an entity page.
// Plain text rendering (headings / bullets kept as written); nothing here
// is shown to the client.
export function CopilotBriefing({ entityId }: { entityId: string }) {
  const [busy, setBusy] = useState(false)
  const [briefing, setBriefing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/ai/copilot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entityId }) })
    const body = (await res.json().catch(() => ({}))) as { briefing?: string; error?: string }
    setBusy(false)
    if (!res.ok || !body.briefing) return setError(body.error ?? 'Co-Pilot could not run.')
    setBriefing(body.briefing)
  }

  return (
    <section className="card card-pad flex flex-col gap-3" aria-label="Co-Pilot briefing">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="t-title3 flex items-center gap-2"><IconSparkles size={18} stroke={1.75} aria-hidden="true" />Co-Pilot briefing</h2>
        <button type="button" className="btn btn-tinted btn-sm" disabled={busy} onClick={run}>
          {busy ? 'Reading the records…' : briefing ? 'Refresh' : 'Brief me'}
        </button>
      </div>
      <p className="t-footnote t-3 flex items-center gap-1.5"><IconEyeOff size={14} stroke={1.75} aria-hidden="true" />For you only. Drafted by LexReg AI from the records on file — check before relying on it.</p>
      {error && <p className="t-footnote" style={{ color: 'var(--bad)' }} role="alert">{error}</p>}
      {briefing && <div className="t-callout whitespace-pre-wrap" style={{ lineHeight: 1.55 }}>{briefing.replace(/\*\*/g, '')}</div>}
    </section>
  )
}
