'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CirclePlus } from 'lucide-react'

const EASE = [0.16, 1, 0.3, 1] as const

const FAQS = [
  {
    q: 'How does company registration work without a BRS API?',
    a: 'BRS has no public API. LexReg generates all required documents — CR1, CR8, board resolutions — then guides you through the hybrid filing process. You upload the signed forms, we track status, and you upload the certificate once issued. Nothing falls through the cracks.',
  },
  {
    q: 'What happens to my documents if I stop midway through onboarding?',
    a: 'Every step auto-saves to your entity record. You can close the browser and return days later without losing progress. Kenya DPA 2019 requires 30-day data retention — your data is safe and recoverable throughout.',
  },
  {
    q: 'Can a lawyer access my entity information?',
    a: "Yes — but only the entity and service request you specifically assign them to via invite link. Lawyers have zero cross-entity visibility. LexReg's super admin manages assignments and never sets or knows lawyer passwords.",
  },
  {
    q: 'How accurate is the OCR document extraction?',
    a: 'We use Google Document AI with a 60% confidence threshold. Below that, the system flags fields for manual review so you never submit guessed data. A Gemini Vision fallback handles edge cases like handwritten documents or poor-quality scans.',
  },
  {
    q: 'What is the Legal Audit and how long does it take?',
    a: "A comprehensive health check across statutory, tax (KRA), employment (ELRC), data protection (DPA 2019), IP, and contracts. Delivered as a written report within 5 working days. It covers gaps you likely don't know exist — especially DPA 2019 exposure, which most SMEs miss entirely.",
  },
  {
    q: 'Is my data stored securely?',
    a: 'All data is stored on Supabase (Frankfurt region, EU-Central) with row-level security enforced on every table. Every action writes to an immutable audit log. Soft-delete only — no data is ever hard-deleted.',
  },
  {
    q: 'Do you support informal businesses or sole traders?',
    a: "Yes. We have a dedicated 15-question readiness assessment for informal businesses that produces a maturity score (0–100) and a gap analysis. It's the first step toward formalisation without requiring you to know anything about the process upfront.",
  },
]

function FaqItem({ item, index }: { item: (typeof FAQS)[number]; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: EASE, delay: index * 0.05 }}
      className="mb-3 overflow-hidden rounded-2xl bg-white"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-[17px] font-semibold tracking-[-0.01em]" style={{ color: '#1C1C1E' }}>
          {item.q}
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="shrink-0"
          style={{ color: 'rgba(60,60,67,0.45)' }}
        >
          <CirclePlus size={22} strokeWidth={2} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <p className="px-6 pb-6 text-[15px] leading-relaxed" style={{ color: 'rgba(60,60,67,0.75)' }}>
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function IosFaq() {
  return (
    <section id="faq" className="scroll-mt-24 px-4 py-24">
      <div className="mx-auto max-w-4xl">
        <p
          className="text-[13px] font-bold uppercase tracking-[0.15em]"
          style={{ color: '#800020' }}
        >
          FAQ
        </p>
        <h2
          className="mb-12 mt-3 font-bold"
          style={{
            fontSize: 'clamp(30px, 4vw, 44px)',
            letterSpacing: '-0.03em',
            color: '#1C1C1E',
          }}
        >
          Questions, answered.
        </h2>

        {FAQS.map((item, i) => (
          <FaqItem key={item.q} item={item} index={i} />
        ))}
      </div>
    </section>
  )
}
