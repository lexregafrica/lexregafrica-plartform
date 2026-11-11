'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'

// FAQ — adapted from Spectrum UI "FAQ Tabs Card": tabbed groups with
// animated accordion answers and a contact footer.

const TABS = [
  {
    label: 'Getting started',
    faqs: [
      { q: 'What does LexReg cost?', a: 'The dashboard, registers, reminders and LexReg AI are free. You pay only for services like a legal audit or formation, and you see the price before any work starts.' },
      { q: 'What happens if I stop halfway?', a: 'Nothing is lost. Every step saves as a draft, so you can close the browser and come back days later.' },
      { q: 'Does LexReg file with BRS for me?', a: 'No, and we will never pretend to. BRS has no public API. We prepare every form and resolution, you file them on eCitizen, then upload the certificate. We track it from there.' },
    ],
  },
  {
    label: 'LexReg AI',
    faqs: [
      { q: 'Can LexReg AI give me legal advice?', a: 'No. It answers questions about your own records and drafts work for an advocate. Anything legal, like an audit report, is checked and signed by a lawyer before you see it.' },
      { q: 'What does the AI see, and where does it go?', a: 'Only the records of the entity you ask about, and only what you could already see. Requests go to our AI provider with data retention switched off, and every answer is logged.' },
    ],
  },
  {
    label: 'Privacy',
    faqs: [
      { q: 'Can a lawyer see my other businesses?', a: 'No. A lawyer sees only the one entity they are working on. Every view and action is written to the audit log.' },
      { q: 'Where is my data stored?', a: 'In the EU (Frankfurt), with access locked to your organisation and an audit log of every action. Deleted records stay recoverable for 30 days.' },
    ],
  },
]

export function LandingFaq() {
  const [tab, setTab] = useState(0)
  const [open, setOpen] = useState(0)
  const current = TABS[tab]

  return (
    <div className="mx-auto mt-10 flex w-full max-w-2xl flex-col rounded-[26px] bg-white p-4 shadow-[0_0_0_1px_rgba(10,10,10,0.05),0_2px_4px_0_rgba(0,0,0,0.1)] sm:p-6">
      <div className="flex min-h-10 items-center rounded-full bg-neutral-100 p-1" role="tablist" aria-label="FAQ topics">
        {TABS.map((t, i) => {
          const active = i === tab
          return (
            <button key={t.label} type="button" role="tab" aria-selected={active} onClick={() => { setTab(i); setOpen(0) }} className="relative h-8 flex-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#800020]">
              {active && <motion.span layoutId="faq-tab-pill" className="absolute inset-0 rounded-full bg-white shadow-sm" transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />}
              <span className={`relative z-10 text-sm font-medium transition-colors ${active ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-800'}`}>{t.label}</span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} role="tabpanel" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: 'easeOut' }} className="mt-3 overflow-hidden rounded-[18px] border border-neutral-200">
          {current.faqs.map((f, i) => {
            const isOpen = i === open
            return (
              <div key={f.q} className={`transition-colors duration-300 ${i > 0 ? 'border-t border-neutral-200' : ''} ${isOpen ? 'bg-neutral-50' : ''}`}>
                <h3 className="m-0">
                  <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen} aria-controls={`faq-${tab}-${i}`} className="flex min-h-14 w-full items-start justify-between gap-4 p-4 text-left">
                    <span className="text-[15px] font-medium leading-6 text-neutral-900">{f.q}</span>
                    <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="mt-1 flex shrink-0">
                      <ChevronDown className="size-4 text-neutral-700" aria-hidden="true" />
                    </motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div id={`faq-${tab}-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }} className="overflow-hidden">
                      <p className="m-0 px-4 pb-5 text-[15px] leading-relaxed text-neutral-600">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </motion.div>
      </AnimatePresence>

      <a href="mailto:hello@lexreg.africa" className="mt-6 flex h-10 w-full items-center justify-center rounded-full border border-neutral-200 bg-white text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50">
        Still have a question? Email us
      </a>
    </div>
  )
}
