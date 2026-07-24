'use client'

import { useState } from 'react'

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

const CARD = 'rounded-[24px] bg-white p-5'
const inputCls = 'w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#800020]/30'
const inputStyle = { borderColor: 'var(--system-fill-3)', background: 'var(--system-bg)', color: 'var(--system-label)' } as const

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
    <div className={CARD}>
      <h3 className="text-ios-subhead mb-3 font-bold" style={{ color: 'var(--system-label)' }}>Assigned lawyers</h3>

      {active.length === 0 && !showForm && (
        <p className="text-ios-footnote mb-3" style={{ color: 'var(--system-label-2)' }}>No lawyer assigned to this entity yet.</p>
      )}

      {active.map((a) => (
        <div key={a.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--system-fill-4)' }}>
          <div className="min-w-0">
            <p className="text-ios-footnote font-semibold truncate" style={{ color: 'var(--system-label)' }}>{a.lawyerEmail ?? a.lawyerUserId}</p>
            <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
              {SERVICE_TYPES.find((s) => s.value === a.serviceType)?.label ?? a.serviceType}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => unassign(a.id)}
            className="text-ios-caption1 shrink-0 font-semibold text-red-500 disabled:opacity-50"
          >
            Unassign
          </button>
        </div>
      ))}

      {showForm ? (
        <div className="mt-3 space-y-2.5">
          <input type="email" className={inputCls} style={inputStyle} placeholder="lawyer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select className={inputCls} style={inputStyle} value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
            {SERVICE_TYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <input type="text" className={inputCls} style={inputStyle} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          {error && <p className="text-ios-caption1" style={{ color: '#D70015' }}>{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={invite}
              disabled={busy}
              className="flex-1 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--brand-navy)' }}
            >
              {busy ? 'Sending invite…' : 'Send invite'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError('') }}
              className="py-2.5 px-5 rounded-full text-sm font-medium border"
              style={{ borderColor: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-2 w-full py-2.5 rounded-xl border border-dashed text-sm font-medium"
          style={{ borderColor: 'var(--system-fill-2, #d1d1d6)', color: 'var(--brand-navy)' }}
        >
          + Invite a lawyer
        </button>
      )}
    </div>
  )
}
