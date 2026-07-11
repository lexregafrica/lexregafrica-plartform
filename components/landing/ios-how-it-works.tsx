'use client'

import { motion } from 'motion/react'

const EASE = [0.16, 1, 0.3, 1] as const

const STEPS = [
  {
    title: 'Choose your path',
    body: 'New entity, existing entity, or informal business',
    time: '~2 min',
  },
  {
    title: 'Answer the questionnaire',
    body: 'Names, directors, shareholders, capital — saved as you go',
    time: '~15 min',
  },
  {
    title: 'Upload documents',
    body: 'IDs and proof of address — OCR pre-fills your forms',
    time: '~5 min',
  },
  {
    title: 'File & activate',
    body: 'Get your IDP, file at BRS, upload your certificate back — done',
    time: 'Instant IDP',
    highlight: true,
  },
]

export function IosHowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-24 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          className="text-[13px] font-bold uppercase tracking-[0.15em]"
          style={{ color: '#800020' }}
        >
          How it works
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
          className="mt-3 font-bold"
          style={{
            fontSize: 'clamp(30px, 4vw, 44px)',
            letterSpacing: '-0.03em',
            color: '#1C1C1E',
          }}
        >
          Four steps. One certificate.
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
          className="mt-12 rounded-3xl bg-white px-6 md:px-10"
        >
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="flex items-center gap-6 py-7"
              style={i > 0 ? { borderTop: '1px solid rgba(60,60,67,0.12)' } : undefined}
            >
              <div
                className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full text-[20px] font-bold text-white"
                style={{ background: '#800020', width: 52, height: 52 }}
              >
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[19px] font-bold tracking-[-0.02em]" style={{ color: '#1C1C1E' }}>
                  {step.title}
                </h3>
                <p className="mt-1 text-[15px]" style={{ color: 'rgba(60,60,67,0.75)' }}>
                  {step.body}
                </p>
              </div>
              <span
                className="shrink-0 text-[14px] font-semibold"
                style={{ color: step.highlight ? '#800020' : 'rgba(60,60,67,0.45)' }}
              >
                {step.time}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
