'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { IconPlus, IconMinus } from '@tabler/icons-react'

const GOLD = '#C9A227'
const NAVY = '#1A1A2E'
const ease: [number, number, number, number] = [0.16, 1, 0.3, 1]

const FAQS = [
  {
    q: 'How does company registration work without a BRS API?',
    a: "BRS has no public API. LexReg generates all required documents — CR1, CR8, board resolutions — then guides you through the hybrid filing process. You upload the signed forms, we track status, and you upload the certificate once issued. Nothing falls through the cracks.",
  },
  {
    q: 'What happens to my documents if I stop midway through onboarding?',
    a: 'Every step auto-saves to your entity record. You can close the browser and return days later without losing progress. Kenya DPA 2019 requires 30-day data retention — your data is safe and recoverable throughout.',
  },
  {
    q: 'Can a lawyer access my entity information?',
    a: "Yes — but only the entity and service request you specifically assign them to via invite link. Lawyers have zero cross-entity visibility. Charles (LexReg's super admin) manages assignments and never sets or knows lawyer passwords.",
  },
  {
    q: 'How accurate is the OCR document extraction?',
    a: 'We use Google Document AI with a 60% confidence threshold. Below that, the system flags fields for manual review so you never submit guessed data. A Gemini Vision fallback handles edge cases like handwritten documents or poor-quality scans.',
  },
  {
    q: 'What is the Legal Audit and how long does it take?',
    a: 'A comprehensive health check across statutory, tax (KRA), employment (ELRC), data protection (DPA 2019), IP, and contracts. Delivered as a written report within 5 working days. It covers gaps you likely don\'t know exist — especially DPA 2019 exposure, which most SMEs miss entirely.',
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

function FAQItem({ item, isOpen, onToggle }: {
  item: typeof FAQS[number]
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl transition-all duration-200"
      style={{
        background: isOpen ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.70)',
        border: isOpen ? `1px solid rgba(201,162,39,0.20)` : '1px solid rgba(0,0,0,0.06)',
        boxShadow: isOpen ? '0 4px 16px rgba(0,0,0,0.05)' : 'none',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-4 px-6 py-5 text-left"
        style={{ cursor: 'pointer' }}
        aria-expanded={isOpen}
      >
        <span
          className="mt-0.5 flex-1 font-medium leading-snug"
          style={{
            color: isOpen ? NAVY : '#374151',
            fontSize: 'clamp(14px, 1.4vw, 15px)',
            fontFamily: 'SF Pro Text, system-ui, sans-serif',
            fontWeight: isOpen ? 600 : 500,
          }}
        >
          {item.q}
        </span>
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-200"
          style={{
            background: isOpen ? `${GOLD}18` : 'rgba(0,0,0,0.05)',
          }}
        >
          {isOpen
            ? <IconMinus size={13} stroke={2.5} style={{ color: GOLD }} />
            : <IconPlus  size={13} stroke={2.5} style={{ color: '#9CA3AF' }} />
          }
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
          >
            <div className="px-6 pb-5 pt-0">
              <div
                className="h-px w-full mb-4"
                style={{ background: 'rgba(201,162,39,0.12)' }}
              />
              <p
                style={{
                  color: '#4B5563',
                  fontSize: '14px',
                  lineHeight: 1.75,
                  fontFamily: 'SF Pro Text, system-ui, sans-serif',
                }}
              >
                {item.a}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section className="relative px-4 py-20 md:py-28">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="mb-3 text-xs font-semibold uppercase tracking-[0.15em]"
            style={{ color: GOLD, fontFamily: 'SF Pro Text, system-ui, sans-serif' }}
          >
            FAQ
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease, delay: 0.06 }}
            style={{
              fontFamily: 'SF Pro Display, system-ui, sans-serif',
              fontSize: 'clamp(26px, 3.5vw, 40px)',
              fontWeight: 700,
              color: NAVY,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
            }}
          >
            Questions we get a lot
          </motion.h2>
        </div>

        {/* FAQ list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease, delay: 0.1 }}
          className="flex flex-col gap-3"
        >
          {FAQS.map((item, i) => (
            <FAQItem
              key={i}
              item={item}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
