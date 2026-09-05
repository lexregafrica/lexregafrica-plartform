'use client'

import { useState } from 'react'

export function DeleteEntityDialog({
  entityId,
  entityName,
  onClose,
  onDeleted,
}: {
  entityId: string
  entityName: string
  onClose: () => void
  onDeleted: () => void
}) {
  // Two explicit steps, not one click behind a "Delete" label — a business
  // owner could easily misread which card they're tapping in a long list,
  // and this can't be undone from their side of things.
  const [step, setStep] = useState<1 | 2>(1)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const canConfirm = confirmText.trim().toLowerCase() === entityName.trim().toLowerCase()

  const handleDelete = async () => {
    if (!canConfirm) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/entities/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Failed to delete — please try again.')
        setBusy(false)
        return
      }
      onDeleted()
    } catch {
      setError('Failed to delete — please try again.')
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={busy ? undefined : onClose}
    >
      <div
        className="w-full max-w-[440px] rounded-t-3xl p-6 sm:rounded-3xl"
        style={{ background: 'var(--system-bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {step === 1 ? (
          <>
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: 'rgba(255,59,48,0.12)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#D70015" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
              </svg>
            </div>
            <h2 className="text-ios-title3 mb-2 text-center" style={{ color: 'var(--system-label)' }}>
              Delete &ldquo;{entityName}&rdquo;?
            </h2>
            <p className="text-ios-footnote text-center" style={{ color: 'var(--system-label-2)' }}>
              This deletes the entity and everything filed under it on LexReg Africa — directors, shareholders,
              beneficial owners, uploaded documents, and the information document package. This action is{' '}
              <strong style={{ color: 'var(--system-label)' }}>permanent</strong> — once deleted, you and your
              organisation lose access to this record and it cannot be recovered from your account.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border px-5 py-2.5 text-sm font-medium"
                style={{ borderColor: 'var(--system-fill-3)', color: 'var(--system-label)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: '#D70015' }}
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-ios-title3 mb-2" style={{ color: 'var(--system-label)' }}>
              Confirm deletion
            </h2>
            <p className="text-ios-footnote mb-4" style={{ color: 'var(--system-label-2)' }}>
              Type <strong style={{ color: 'var(--system-label)' }}>{entityName}</strong> below to confirm you
              want to permanently delete it. This cannot be undone.
            </p>
            <input
              type="text"
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={entityName}
              className="w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#D70015]/30"
              style={{ borderColor: 'var(--system-fill-3)', background: 'var(--system-bg)', color: 'var(--system-label)' }}
            />
            {error && <p className="mt-2 text-xs" style={{ color: '#D70015' }}>{error}</p>}
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setStep(1); setConfirmText(''); setError('') }}
                disabled={busy}
                className="flex-1 rounded-full border px-5 py-2.5 text-sm font-medium disabled:opacity-50"
                style={{ borderColor: 'var(--system-fill-3)', color: 'var(--system-label)' }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canConfirm || busy}
                className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ background: '#D70015' }}
              >
                {busy ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
