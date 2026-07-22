'use client'

import { useState } from 'react'

// Charles's WhatsApp number (international format, no +). Set in .env.local:
// NEXT_PUBLIC_WHATSAPP_NUMBER=2547XXXXXXXX
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''

const inputCls =
  'w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#800020]/30'
const inputStyle = {
  borderColor: 'var(--system-fill-3)',
  background: 'var(--system-bg)',
  color: 'var(--system-label)',
} as const

export type HelpRequestContext = {
  /** Where the request came from, e.g. "Existing entity onboarding — low OCR confidence" */
  source: string
  /** Business/entity name if known */
  businessName?: string | null
  /** Signed download link for the IDP, if one exists for this entity yet */
  idpUrl?: string | null
}

export function HelpRequestSheet({
  context,
  defaultName,
  defaultPhone,
  onClose,
  onSent,
}: {
  context: HelpRequestContext
  defaultName?: string | null
  defaultPhone?: string | null
  onClose: () => void
  onSent?: () => void
}) {
  const [name, setName] = useState(defaultName ?? '')
  const [phone, setPhone] = useState(defaultPhone ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [idpDownloaded, setIdpDownloaded] = useState(false)

  const handleSend = () => {
    if (!name.trim()) { setError('Enter your name.'); return }
    if (!phone.trim()) { setError('Enter your phone number so we can reach you.'); return }
    setError('')

    const lines = [
      `Hello LexReg Africa — I'd like assistance.`,
      ``,
      `Name: ${name.trim()}`,
      `Phone: ${phone.trim()}`,
      context.businessName ? `Business: ${context.businessName}` : null,
      `Regarding: ${context.source}`,
      context.idpUrl ? (idpDownloaded ? `IDP: downloaded — I'll attach it here.` : `IDP: not downloaded yet.`) : null,
      message.trim() ? `` : null,
      message.trim() ? `Message: ${message.trim()}` : null,
    ].filter((l): l is string => l !== null)

    const text = encodeURIComponent(lines.join('\n'))
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank', 'noopener,noreferrer')
    onSent?.()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[440px] rounded-t-3xl p-6 sm:rounded-3xl"
        style={{ background: 'var(--system-bg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-ios-title3 mb-1" style={{ color: 'var(--system-label)' }}>
          Request assistance
        </h2>
        <p className="text-ios-footnote mb-5" style={{ color: 'var(--system-label-2)' }}>
          Send us a message on WhatsApp — our team responds during business hours and will walk you
          through the next steps and pricing.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-ios-footnote mb-1.5 block font-medium" style={{ color: 'var(--system-label-2)' }}>
              Your name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input type="text" className={inputCls} style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-ios-footnote mb-1.5 block font-medium" style={{ color: 'var(--system-label-2)' }}>
              Phone number <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input type="tel" className={inputCls} style={inputStyle} placeholder="07XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-ios-footnote mb-1.5 block font-medium" style={{ color: 'var(--system-label-2)' }}>
              How can we help? (optional)
            </label>
            <textarea rows={3} className={inputCls} style={inputStyle} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>

          {context.idpUrl && (
            <div className="rounded-xl p-3" style={{ background: 'var(--system-bg-2)' }}>
              <p className="text-ios-footnote mb-2 font-medium" style={{ color: 'var(--system-label)' }}>
                Have you downloaded your IDP document?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {([true, false] as const).map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setIdpDownloaded(v)}
                    className="py-2 rounded-lg border text-sm font-medium"
                    style={{
                      borderColor: idpDownloaded === v ? '#800020' : 'var(--system-fill-3)',
                      background: idpDownloaded === v ? 'rgba(128,0,32,0.08)' : 'var(--system-bg)',
                      color: 'var(--system-label)',
                    }}
                  >
                    {v ? 'Yes' : 'Not yet'}
                  </button>
                ))}
              </div>
              {!idpDownloaded && (
                <a
                  href={context.idpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIdpDownloaded(true)}
                  className="mt-2 block w-full rounded-lg py-2 text-center text-sm font-semibold text-white"
                  style={{ background: '#800020' }}
                >
                  Download IDP now
                </a>
              )}
              {idpDownloaded && (
                <p className="text-ios-caption1 mt-2" style={{ color: 'var(--system-label-3)' }}>
                  Great — attach it to the WhatsApp chat when asked.
                </p>
              )}
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border px-5 py-2.5 text-sm font-medium"
            style={{ borderColor: 'var(--system-fill-3)', color: 'var(--system-label-2)' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: '#25D366' }}
          >
            Send via WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
