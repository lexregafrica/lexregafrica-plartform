'use client'

import { useState } from 'react'
import { IconGavel, IconMail, IconPlus, IconAlertCircle, IconLock } from '@tabler/icons-react'

export type LawyerAssignment = {
  id: string
  lawyerUserId: string
  lawyerEmail: string | null
  serviceType: string
  status: string
  notes: string | null
  assignedAt: string
}

const SERVICE_TYPES = [
  { value: 'corporate_services', label: 'Corporate services' },
  { value: 'legal_audit', label: 'Legal audit' },
]


export function LawyerAssignmentPanel({ entityId, assignments }: { entityId: string; assignments: LawyerAssignment[] }) {
  const [list, setList] = useState(assignments)
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [serviceType, setServiceType] = useState('corporate_services')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const active = list.filter((a) => a.status === 'active')

  const invite = async () => {
    if (!email.trim()) { setError('Enter the lawyer’s email.'); return }
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/admin/lawyers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invite', email: email.trim(), entityId, serviceType, notes: notes.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to invite')
      setList([...list, {
        id: crypto.randomUUID(),
        lawyerUserId: data.lawyerUserId,
        lawyerEmail: email.trim(),
        serviceType,
        status: 'active',
        notes: notes.trim() || null,
        assignedAt: new Date().toISOString(),
      }])
      setEmail(''); setNotes(''); setShowForm(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to invite lawyer.')
    } finally {
      setBusy(false)
    }
  }

  const unassign = async (id: string) => {
    setBusy(true)
    try {
      await fetch('/api/admin/lawyers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unassign', assignmentId: id }),
      })
      setList(list.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)))
    } catch {
      setError('Failed to unassign.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card" aria-labelledby="lawyers-h">
      <div className="card-head">
        <h2 id="lawyers-h">Assigned lawyers</h2>
        <span className="t-footnote t-3 t-num">{active.length}</span>
      </div>

      {active.length === 0 && !showForm && (
        <p className="t-footnote t-3 px-5 pb-3">No lawyer assigned to this entity yet.</p>
      )}

      {active.length > 0 && (
        <div className="flex flex-col pb-1.5">
          {active.map((a) => (
            <div key={a.id} className="list-row" style={{ paddingInline: 20 }}>
              <span className="icon-tile" aria-hidden="true"><IconGavel size={17} stroke={1.75} /></span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="t-subhead truncate" style={{ color: 'var(--label)' }}>{a.lawyerEmail ?? a.lawyerUserId}</span>
                <span className="t-footnote t-3">{SERVICE_TYPES.find((s) => s.value === a.serviceType)?.label ?? a.serviceType}</span>
              </span>
              <button type="button" disabled={busy} onClick={() => unassign(a.id)} className="btn btn-plain btn-sm btn-destructive-plain shrink-0">
                Unassign
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 px-5 pb-5">
        {showForm ? (
          <div className="fade flex flex-col gap-3">
            <div className="field">
              <label className="label" htmlFor="lw-email">Lawyer&rsquo;s email</label>
              <div className="input-wrap">
                <IconMail size={18} stroke={1.75} aria-hidden="true" className="absolute left-3" style={{ color: 'var(--label-3)', pointerEvents: 'none' }} />
                <input id="lw-email" type="email" className="input" placeholder="lawyer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ paddingLeft: 38 }} />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="lw-service">Service</label>
              <select id="lw-service" className="select" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                {SERVICE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="lw-notes">Notes <span className="t-3">(optional)</span></label>
              <input id="lw-notes" type="text" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="note note-brand">
              <IconLock size={16} stroke={1.75} aria-hidden="true" />
              <p>We email a magic link. The lawyer sets their own password — you never see it — and sees only this entity and this service.</p>
            </div>
            {error && (
              <p className="error"><IconAlertCircle size={15} stroke={1.75} aria-hidden="true" />{error}</p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={invite} disabled={busy} className="btn btn-primary flex-1">
                {busy ? 'Sending invite…' : 'Send invite'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setError('') }} className="btn btn-gray">Cancel</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowForm(true)} className="btn btn-tinted btn-block">
            <IconPlus size={17} stroke={2} aria-hidden="true" />Invite a lawyer
          </button>
        )}
        {!showForm && error && (
          <p className="error"><IconAlertCircle size={15} stroke={1.75} aria-hidden="true" />{error}</p>
        )}
      </div>
    </section>
  )
}
