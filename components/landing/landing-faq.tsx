'use client'

import { useState } from 'react'
import { IconPlus } from '@tabler/icons-react'

const FAQS = [
  { q: 'Does LexReg file with BRS for me?', a: 'No, and we will never pretend to. BRS has no public API. We prepare every form and resolution, you file them on eCitizen, then upload the certificate. We track it from there.' },
  { q: 'Can LexReg AI give me legal advice?', a: 'No. It answers questions about your own records and drafts work for an advocate. Anything legal, like an audit report, is checked and signed by a lawyer before you see it.' },
  { q: 'What does the AI see, and where does it go?', a: 'Only the records of the entity you ask about, and only what you could already see. Requests go to our AI provider with data retention switched off, and every answer is logged.' },
  { q: 'Can a lawyer see my other businesses?', a: 'No. A lawyer sees only the one entity they are working on. Every view and action is written to the audit log.' },
  { q: 'What happens if I stop halfway?', a: 'Nothing is lost. Every step saves as a draft, so you can close the browser and come back days later.' },
  { q: 'Where is my data stored?', a: 'In the EU (Frankfurt), with access locked to your organisation and an audit log of every action. Deleted records stay recoverable for 30 days.' },
]

export function LandingFaq() {
  const [open, setOpen] = useState(0)
  return (
    <div className="card" style={{ marginTop: 32, padding: 0 }}>
      {FAQS.map((f, i) => {
        const isOpen = open === i
        return (
          <div key={f.q} className={`h2-faq ${isOpen ? 'is-open' : ''}`}>
            <h3 style={{ margin: 0 }}>
              <button type="button" className="h2-faq-q" aria-expanded={isOpen} aria-controls={`faq-${i}`} onClick={() => setOpen(isOpen ? -1 : i)}>
                <span className="t-headline">{f.q}</span>
                <IconPlus size={18} stroke={2} aria-hidden="true" />
              </button>
            </h3>
            <div className="h2-faq-a" id={`faq-${i}`}>
              <div><p className="t-callout t-2" style={{ margin: 0, padding: '0 22px 22px', maxWidth: 680 }}>{f.a}</p></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
