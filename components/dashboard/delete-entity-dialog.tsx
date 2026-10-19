'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { IconTrash, IconAlertCircle } from '@tabler/icons-react'

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

  // Portalled to <body>: an ancestor with a transform (entrance
  // animations) would otherwise trap position:fixed inside it.
  return createPortal((
    <div
      className="lx fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center"
      style={{ background: 'rgba(0,0,0,0.28)', minHeight: 0, animation: 'fade-in var(--dur-spring) var(--ease-calm) both' }}
      onClick={busy ? undefined : onClose}
      role="presentation"
    >
      <div
        className="sheet w-full max-w-[400px]"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="del-h"
        aria-describedby="del-body"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 1 ? (
          <div key="s1" className="fade flex flex-col items-center gap-3 p-6 text-center">
            <span className="icon-tile icon-tile-lg bad" aria-hidden="true"><IconTrash size={22} stroke={1.75} /></span>
            <h2 id="del-h" className="t-title3 t-balance">Delete &ldquo;{entityName}&rdquo;?</h2>
            <p id="del-body" className="t-footnote t-2 t-pretty">
              This deletes the entity and everything filed under it on LexReg Africa — directors, shareholders,
              beneficial owners, uploaded documents, and the information document package. This action is{' '}
              <strong style={{ color: 'var(--label)' }}>permanent</strong> — once deleted, you and your
              organisation lose access to this record and it cannot be recovered from your account.
            </p>
            <div className="mt-3 grid w-full grid-cols-2 gap-2">
              <button type="button" onClick={onClose} className="btn btn-gray">Cancel</button>
              <button type="button" onClick={() => setStep(2)} className="btn btn-destructive">Continue</button>
            </div>
          </div>
        ) : (
          <div key="s2" className="enter-forward flex flex-col gap-3 p-6">
            <h2 id="del-h" className="t-title3">Confirm deletion</h2>
            <p id="del-body" className="t-footnote t-2 t-pretty">
              Type <strong style={{ color: 'var(--label)' }}>{entityName}</strong> below to confirm you
              want to permanently delete it. This cannot be undone.
            </p>
            <input
              type="text"
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={entityName}
              aria-label={`Type ${entityName} to confirm`}
              className="input"
            />
            {error && <p className="error" role="alert"><IconAlertCircle size={15} stroke={1.75} aria-hidden="true" />{error}</p>}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { setStep(1); setConfirmText(''); setError('') }} disabled={busy} className="btn btn-gray">
                Back
              </button>
              <button type="button" onClick={handleDelete} disabled={!canConfirm || busy} className="btn btn-destructive">
                {busy ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  ), document.body)
}
