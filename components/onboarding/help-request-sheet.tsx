'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { IconLifebuoy, IconX, IconDownload, IconAlertCircle, IconMail, IconBrandWhatsapp } from '@tabler/icons-react'

// Charles's WhatsApp number (international format, no +). Set in .env.local:
// NEXT_PUBLIC_WHATSAPP_NUMBER=2547XXXXXXXX
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''
// Charles, 2026: WhatsApp alone reads as "too cliché for something so
// strong" — email is easier to track as a serious conversation, and
// should be offered first, with WhatsApp as the faster alternative.
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? ''


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
  defaultEmail,
  onClose,
  onSent,
}: {
  context: HelpRequestContext
  defaultName?: string | null
  defaultPhone?: string | null
  defaultEmail?: string | null
  onClose: () => void
  onSent?: () => void
}) {
  // Email first — matches Charles's preference for a trackable, "serious"
  // channel; WhatsApp stays as the faster alternative for quick asks.
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email')
  const [name, setName] = useState(defaultName ?? '')
  const [phone, setPhone] = useState(defaultPhone ?? '')
  const [email, setEmail] = useState(defaultEmail ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [idpDownloaded, setIdpDownloaded] = useState(false)

  const handleSend = () => {
    if (!name.trim()) { setError('Enter your name.'); return }
    if (channel === 'whatsapp' && !phone.trim()) { setError('Enter your phone number so we can reach you.'); return }
    if (channel === 'email' && !email.trim()) { setError('Enter your email so we can reach you.'); return }
    setError('')

    const idpLine = context.idpUrl
      ? (idpDownloaded ? `IDP: downloaded — I'll attach it here.` : `IDP: not downloaded yet.`)
      : null

    if (channel === 'email') {
      const subject = encodeURIComponent(`LexReg Africa — assistance request${context.businessName ? ` (${context.businessName})` : ''}`)
      const bodyLines = [
        `Name: ${name.trim()}`,
        email.trim() ? `Email: ${email.trim()}` : null,
        phone.trim() ? `Phone: ${phone.trim()}` : null,
        context.businessName ? `Business: ${context.businessName}` : null,
        `Regarding: ${context.source}`,
        idpLine,
        message.trim() ? `` : null,
        message.trim() ? `Message: ${message.trim()}` : null,
      ].filter((l): l is string => l !== null)
      const body = encodeURIComponent(bodyLines.join('\n'))
      window.open(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer')
      onSent?.()
      onClose()
      return
    }

    const lines = [
      `Hello LexReg Africa — I'd like assistance.`,
      ``,
      `Name: ${name.trim()}`,
      `Phone: ${phone.trim()}`,
      context.businessName ? `Business: ${context.businessName}` : null,
      `Regarding: ${context.source}`,
      idpLine,
      message.trim() ? `` : null,
      message.trim() ? `Message: ${message.trim()}` : null,
    ].filter((l): l is string => l !== null)

    const text = encodeURIComponent(lines.join('\n'))
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank', 'noopener,noreferrer')
    onSent?.()
    onClose()
  }

  // Portalled to <body>: an ancestor with a transform (entrance
  // animations) would otherwise trap position:fixed inside it.
  return createPortal((
    <div
      className="lx fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      style={{ background: 'rgba(0,0,0,0.28)', minHeight: 0, animation: 'fade-in var(--dur-spring) var(--ease-calm) both' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="sheet w-full max-w-[460px] rounded-b-none sm:rounded-[22px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-h"
        style={{ maxHeight: 'calc(100dvh - 24px)', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grabber sm:hidden" aria-hidden="true" />
        <div className="flex flex-col gap-5 p-6">
          <header className="flex items-start gap-3">
            <span className="icon-tile icon-tile-lg" aria-hidden="true"><IconLifebuoy size={22} stroke={1.75} /></span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <h2 id="help-h" className="t-title2">Request assistance</h2>
              <p className="t-footnote t-2 t-pretty">Reach our team directly — we respond during business hours and will walk you through the next steps and pricing.</p>
            </div>
            <button type="button" onClick={onClose} className="btn btn-gray btn-icon btn-sm btn-pill shrink-0" aria-label="Close"><IconX size={16} stroke={2} aria-hidden="true" /></button>
          </header>

          <div className="seg" role="radiogroup" aria-label="Contact channel" style={{ '--n': 2, '--i': channel === 'email' ? 0 : 1 } as React.CSSProperties}>
            {([['email', 'Email'], ['whatsapp', 'WhatsApp']] as const).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={channel === v} className={channel === v ? 'is-on' : ''} onClick={() => setChannel(v)}>{label}</button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <div className="field">
              <label className="label" htmlFor="help-name">Your name <span className="req">*</span></label>
              <input id="help-name" type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {channel === 'email' ? (
              <div className="field">
                <label className="label" htmlFor="help-email">Your email <span className="req">*</span></label>
                <input id="help-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            ) : (
              <div className="field">
                <label className="label" htmlFor="help-phone">Phone number <span className="req">*</span></label>
                <input id="help-phone" type="tel" className="input" placeholder="07XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label className="label" htmlFor="help-msg">How can we help? <span className="t-3">(optional)</span></label>
              <textarea id="help-msg" rows={3} className="textarea" value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>

            {context.idpUrl && (
              <div className="well flex flex-col gap-3">
                <p className="t-subhead" style={{ color: 'var(--label)', fontWeight: 600 }}>Have you downloaded your IDP document?</p>
                <div className="seg" role="radiogroup" aria-label="IDP downloaded" style={{ '--n': 2, '--i': idpDownloaded ? 0 : 1 } as React.CSSProperties}>
                  {([true, false] as const).map((v) => (
                    <button key={String(v)} type="button" role="radio" aria-checked={idpDownloaded === v} className={idpDownloaded === v ? 'is-on' : ''} onClick={() => setIdpDownloaded(v)}>
                      {v ? 'Yes' : 'Not yet'}
                    </button>
                  ))}
                </div>
                {!idpDownloaded ? (
                  <a href={context.idpUrl} target="_blank" rel="noopener noreferrer" onClick={() => setIdpDownloaded(true)} className="btn btn-tinted btn-block">
                    <IconDownload size={16} stroke={1.75} aria-hidden="true" />Download IDP now
                  </a>
                ) : (
                  <p className="t-footnote t-3">Great — attach it to the {channel === 'email' ? 'email' : 'WhatsApp chat'} when asked.</p>
                )}
              </div>
            )}
          </div>

          {error && <p className="error" role="alert"><IconAlertCircle size={15} stroke={1.75} aria-hidden="true" />{error}</p>}

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn btn-gray">Cancel</button>
            <button type="button" onClick={handleSend} className="btn btn-primary flex-1">
              {channel === 'email' ? <IconMail size={17} stroke={1.75} aria-hidden="true" /> : <IconBrandWhatsapp size={17} stroke={1.75} aria-hidden="true" />}
              {channel === 'email' ? 'Send via email' : 'Send via WhatsApp'}
            </button>
          </div>
        </div>
      </div>
    </div>
  ), document.body)
}
