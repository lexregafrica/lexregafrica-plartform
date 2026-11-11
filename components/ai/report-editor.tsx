'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { IconRobot, IconSignature, IconAlertTriangle, IconCircleCheck, IconHelpCircle } from '@tabler/icons-react'

// One component for every view of a LexAudit report: the reviewer edits
// findings, then signs & releases or rejects; the client sees the same
// report read-only once released. Placeholder checklist is flagged.

export type EditorFinding = {
  checkId: string
  area: string
  question: string
  status: 'in_order' | 'gap' | 'unclear'
  summary: string
  detail: string
  recommendation: string
  sources: string[]
  aiGenerated: boolean
}

export type EditorReport = {
  id: string
  title: string
  entityName: string
  status: string
  checklist: string
  createdAt: string
  signedAt: string | null
  findings: EditorFinding[]
}

const STATUS = {
  in_order: { label: 'In order', pill: 'pill-good', Icon: IconCircleCheck },
  gap: { label: 'Gap', pill: 'pill-bad', Icon: IconAlertTriangle },
  unclear: { label: 'Unclear', pill: 'pill-warn', Icon: IconHelpCircle },
} as const

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi' })

export function ReportEditor({ report, readOnly, backHref }: { report: EditorReport; readOnly: boolean; backHref: string }) {
  const router = useRouter()
  const [findings, setFindings] = useState(report.findings)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState<null | 'save' | 'release' | 'reject'>(null)
  const [message, setMessage] = useState<string | null>(null)
  const final = report.status === 'released' || report.status === 'rejected'
  const editable = !readOnly && !final

  const update = (i: number, patch: Partial<EditorFinding>) =>
    setFindings((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch, aiGenerated: false } : f)))

  async function act(action: 'save' | 'release' | 'reject') {
    if (action === 'reject' && !window.confirm('Reject this draft? It will not be sent to the client.')) return
    setBusy(action)
    setMessage(null)
    const res = await fetch(`/api/ai/drafts/${report.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action === 'reject' ? { action } : { action, findings, ...(action === 'release' ? { confirm: true } : {}) }),
    })
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    setBusy(null)
    if (!res.ok) return setMessage(body.error ?? 'Could not save.')
    if (action === 'save') setMessage('Edits saved.')
    else router.push(backHref)
    router.refresh()
  }

  const counts = { gap: findings.filter((f) => f.status === 'gap').length, unclear: findings.filter((f) => f.status === 'unclear').length }

  return (
    <main className="content">
      <header className="page-head rise">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="t-title1 break-words">{report.title}</h1>
          <p className="t-callout t-2">
            {counts.gap} gap{counts.gap === 1 ? '' : 's'} · {counts.unclear} unclear · drafted {fmt(report.createdAt)}
            {report.signedAt ? ` · signed ${fmt(report.signedAt)}` : ''}
          </p>
        </div>
        <span className={`pill ${report.status === 'released' ? 'pill-good' : report.status === 'rejected' ? 'pill-bad' : 'pill-warn'}`}>
          {report.status === 'released' ? 'Signed & released' : report.status === 'rejected' ? 'Rejected' : 'Awaiting sign-off'}
        </span>
      </header>

      {!readOnly && report.checklist === 'placeholder' && (
        <div className="note note-warn">
          <IconAlertTriangle size={18} stroke={1.75} aria-hidden="true" />
          <p>Drafted against the <strong>placeholder checklist</strong>. Replace it with Charles&rsquo;s audit checklist before releasing reports to paying clients.</p>
        </div>
      )}
      {editable && (
        <div className="note note-brand">
          <IconRobot size={18} stroke={1.75} aria-hidden="true" />
          <p>Every finding was drafted by LexReg AI from the records on file. Check each one against the documents, edit as needed, then sign.</p>
        </div>
      )}

      <ol className="flex flex-col gap-4">
        {findings.map((f, i) => {
          const s = STATUS[f.status]
          return (
            <li key={f.checkId} className="card card-pad flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="t-title3">{i + 1}. {f.area}</h2>
                <span className="flex items-center gap-2">
                  {f.aiGenerated && editable && <span className="pill pill-info"><IconRobot size={13} stroke={1.75} aria-hidden="true" />AI draft</span>}
                  {editable ? (
                    <select className="select" style={{ width: 140, height: 32 }} value={f.status} aria-label={`Status for ${f.area}`} onChange={(e) => update(i, { status: e.target.value as EditorFinding['status'] })}>
                      <option value="in_order">In order</option>
                      <option value="gap">Gap</option>
                      <option value="unclear">Unclear</option>
                    </select>
                  ) : (
                    <span className={`pill ${s.pill}`}><s.Icon size={13} stroke={1.75} aria-hidden="true" />{s.label}</span>
                  )}
                </span>
              </div>
              <p className="t-footnote t-3">{f.question}</p>

              {editable ? (
                <>
                  <label className="flex flex-col gap-1"><span className="t-footnote t-2">Finding</span>
                    <textarea className="textarea" value={f.summary} onChange={(e) => update(i, { summary: e.target.value })} rows={2} />
                  </label>
                  <label className="flex flex-col gap-1"><span className="t-footnote t-2">What the records show</span>
                    <textarea className="textarea" value={f.detail} onChange={(e) => update(i, { detail: e.target.value })} rows={3} />
                  </label>
                  <label className="flex flex-col gap-1"><span className="t-footnote t-2">Recommendation</span>
                    <textarea className="textarea" value={f.recommendation} onChange={(e) => update(i, { recommendation: e.target.value })} rows={2} />
                  </label>
                </>
              ) : (
                <>
                  <p className="t-body">{f.summary}</p>
                  {f.detail && <p className="t-callout t-2 whitespace-pre-wrap">{f.detail}</p>}
                  {f.recommendation && <p className="t-callout"><strong>Recommendation:</strong> {f.recommendation}</p>}
                </>
              )}
              {f.sources.length > 0 && (
                <p className="t-footnote t-3">Sources: {f.sources.join(' · ')}</p>
              )}
            </li>
          )
        })}
      </ol>

      {editable && (
        <section className="card card-pad flex flex-col gap-3" aria-label="Sign-off">
          <label className="flex items-start gap-2 t-callout">
            <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-1" />
            I have checked every finding against the records and sign this report. The client is notified and it cannot be edited afterwards.
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-primary" disabled={!confirm || !!busy} onClick={() => act('release')}>
              <IconSignature size={17} stroke={1.75} aria-hidden="true" />{busy === 'release' ? 'Releasing…' : 'Sign & release'}
            </button>
            <button type="button" className="btn btn-secondary" disabled={!!busy} onClick={() => act('save')}>{busy === 'save' ? 'Saving…' : 'Save edits'}</button>
            <button type="button" className="btn btn-plain btn-destructive-plain ml-auto" disabled={!!busy} onClick={() => act('reject')}>Reject draft</button>
          </div>
          {message && <p className="t-footnote t-2" role="status">{message}</p>}
        </section>
      )}
    </main>
  )
}

export function StartAuditButton({ entityId, label = 'Run LexAudit draft', reviewBase }: { entityId: string; label?: string; reviewBase: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/ai/lexaudit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entityId }) })
    const body = (await res.json().catch(() => ({}))) as { draftId?: string; error?: string }
    setBusy(false)
    if (!res.ok || !body.draftId) return setError(body.error ?? 'LexAudit could not run.')
    router.push(`${reviewBase}/${body.draftId}`)
  }

  return (
    <span className="flex flex-col items-start gap-1">
      <button type="button" className="btn btn-tinted btn-sm" disabled={busy} onClick={start}>
        <IconRobot size={15} stroke={1.75} aria-hidden="true" />{busy ? 'Drafting… (about a minute)' : label}
      </button>
      {error && <span className="t-footnote" style={{ color: 'var(--bad)' }} role="alert">{error}</span>}
    </span>
  )
}
