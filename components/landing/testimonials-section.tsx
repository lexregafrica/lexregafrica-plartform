'use client'

import { motion } from 'motion/react'
import { IconQuote } from '@tabler/icons-react'

const GOLD = '#C9A227'
const NAVY = '#1A1A2E'

const TESTIMONIALS = [
  {
    quote:
      'We tried to register our limited company for four months. LexReg had our certificate ready in three weeks. The document OCR alone saved us hours of manual data entry.',
    name: 'Amina Wanjiru',
    role: 'Co-Founder, Savanna Logistics Ltd',
    location: 'Nairobi',
    initials: 'AW',
    accentColor: '#C9A227',
  },
  {
    quote:
      'As a lawyer, I was sceptical. But the board resolution templates are legally sound and the whole AGM package took fifteen minutes instead of two days.',
    name: 'Peter Odhiambo',
    role: 'Advocate of the High Court',
    location: 'Kisumu',
    initials: 'PO',
    accentColor: '#2563eb',
  },
  {
    quote:
      'We did not know we had DPA 2019 exposure until the legal audit flagged it. That report alone justified everything. Now we are actually compliant.',
    name: 'Grace Muthoni',
    role: 'CEO, Fintech Frontier Kenya',
    location: 'Mombasa',
    initials: 'GM',
    accentColor: '#059669',
  },
  {
    quote:
      'Started as an informal business and had no idea where to begin. LexReg walked me through the maturity assessment, and I now have a clear roadmap to formalisation.',
    name: 'David Kipchoge',
    role: 'Founder, Rift Valley Agri',
    location: 'Eldoret',
    initials: 'DK',
    accentColor: '#7c3aed',
  },
]

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

function TestimonialCard({ t }: { t: (typeof TESTIMONIALS)[number] }) {
  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col gap-5 rounded-3xl p-6"
      style={{
        background: 'rgba(255,255,255,0.82)',
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Quote icon */}
      <div
        className="flex h-8 w-8 items-center justify-center rounded-xl"
        style={{ background: `${t.accentColor}14` }}
      >
        <IconQuote size={15} stroke={2} style={{ color: t.accentColor }} />
      </div>

      {/* Quote text */}
      <p
        className="flex-1 leading-relaxed"
        style={{
          color: NAVY,
          fontSize: '14px',
          fontFamily: 'SF Pro Text, system-ui, sans-serif',
          lineHeight: 1.72,
        }}
      >
        &ldquo;{t.quote}&rdquo;
      </p>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold tracking-wide"
          style={{
            background: `${t.accentColor}18`,
            color: t.accentColor,
            fontFamily: 'SF Pro Display, system-ui, sans-serif',
          }}
        >
          {t.initials}
        </div>
        <div>
          <p
            style={{
              color: NAVY,
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'SF Pro Text, system-ui, sans-serif',
            }}
          >
            {t.name}
          </p>
          <p style={{ color: '#737373', fontSize: '11px', fontFamily: 'SF Pro Text, system-ui, sans-serif' }}>
            {t.role} · {t.location}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export function TestimonialsSection() {
  return (
    <section className="relative px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3 text-xs font-semibold uppercase tracking-[0.15em]"
            style={{ color: GOLD, fontFamily: 'SF Pro Text, system-ui, sans-serif' }}
          >
            Testimonials
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
            style={{
              fontFamily: 'SF Pro Display, system-ui, sans-serif',
              fontSize: 'clamp(26px, 3.5vw, 40px)',
              fontWeight: 700,
              color: NAVY,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
            }}
          >
            Kenyan businesses trust LexReg
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-3"
            style={{
              color: '#737373',
              fontSize: 'clamp(14px, 1.5vw, 16px)',
              lineHeight: 1.6,
              fontFamily: 'SF Pro Text, system-ui, sans-serif',
              maxWidth: '420px',
            }}
          >
            From Nairobi startups to Eldoret agribusiness — real results across
            Kenya&apos;s regulatory landscape.
          </motion.p>
        </div>

        {/* Cards grid */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} t={t} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
