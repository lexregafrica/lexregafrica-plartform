'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import {
  PenNewSquare,
  FolderWithFiles,
  CaseMinimalistic,
  Magnifer,
  Leaf,
  ArrowRight,
  CheckCircle,
} from '@solar-icons/react'

const EASE = [0.16, 1, 0.3, 1] as const

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: EASE, delay },
})

const WIZARD_STEPS = ['Entity type', 'Directors', 'Shareholders']

export function IosServices() {
  return (
    <section id="services" className="scroll-mt-24 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <motion.p
          {...fadeUp()}
          className="text-[13px] font-bold uppercase tracking-[0.15em]"
          style={{ color: '#800020' }}
        >
          Services
        </motion.p>
        <motion.h2
          {...fadeUp(0.05)}
          className="mt-3 font-bold"
          style={{
            fontSize: 'clamp(30px, 4vw, 44px)',
            letterSpacing: '-0.03em',
            color: '#1C1C1E',
          }}
        >
          Everything your business needs.
        </motion.h2>

        {/* Bento row 1 */}
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {/* New Entity — wide card */}
          <motion.div
            {...fadeUp(0.1)}
            className="rounded-3xl bg-white p-8 md:p-10 lg:col-span-2"
          >
            <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              <div className="max-w-sm">
                <PenNewSquare weight="BoldDuotone" size={44} color="#800020" />
                <h3
                  className="mt-6 text-[26px] font-bold tracking-[-0.02em]"
                  style={{ color: '#1C1C1E' }}
                >
                  New Entity Formation
                </h3>
                <p className="mt-3 text-[16px] leading-relaxed" style={{ color: 'rgba(60,60,67,0.75)' }}>
                  12-step guided wizard. Directors, shareholders, capital —
                  collected once, packaged into a ready-to-file IDP.
                </p>
                <Link
                  href="/signup"
                  className="mt-6 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[14px] font-semibold transition-colors hover:bg-neutral-200"
                  style={{ background: '#F2F2F7', color: '#800020' }}
                >
                  Get started <ArrowRight weight="Linear" size={16} />
                </Link>
              </div>

              {/* Mini wizard preview */}
              <div className="w-full shrink-0 rounded-2xl p-4 md:w-64" style={{ background: '#F2F2F7' }}>
                {WIZARD_STEPS.map((step, i) => (
                  <div
                    key={step}
                    className="mb-2.5 rounded-xl bg-white px-4 py-3 text-[13px] font-semibold"
                    style={{ color: '#1C1C1E' }}
                  >
                    {i + 1} · {step}
                  </div>
                ))}
                <div
                  className="flex items-center gap-1.5 rounded-xl px-4 py-3 text-[13px] font-bold text-white"
                  style={{ background: '#800020' }}
                >
                  <CheckCircle weight="Bold" size={15} /> IDP generated
                </div>
              </div>
            </div>
          </motion.div>

          {/* Legal Audit — burgundy card */}
          <motion.div {...fadeUp(0.15)} className="rounded-3xl p-8 md:p-10" style={{ background: '#800020' }}>
            <Magnifer weight="BoldDuotone" size={44} color="#FFFFFF" />
            <h3 className="mt-6 text-[24px] font-bold tracking-[-0.02em] text-white">Legal Audit</h3>
            <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Full compliance review and risk report across statutory, tax,
              employment, and data protection.
            </p>
            <p className="mt-8 text-[30px] font-bold text-white">KES 25,000</p>
            <p className="mt-1 text-[13px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
              one-time, per entity
            </p>
          </motion.div>
        </div>

        {/* Bento row 2 */}
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: FolderWithFiles,
              title: 'Existing Entity',
              body: 'Upload your documents. OCR fills in the rest.',
              cta: 'Upload & activate',
            },
            {
              icon: CaseMinimalistic,
              title: 'Corporate Services',
              body: 'Board minutes, AGM notices, resolutions — generated.',
              cta: 'Explore',
            },
            {
              icon: Leaf,
              title: 'Going Formal',
              body: 'Free 15-question readiness score for informal businesses.',
              cta: 'Take assessment',
            },
          ].map((card, i) => (
            <motion.div key={card.title} {...fadeUp(0.1 + i * 0.08)} className="rounded-3xl bg-white p-8">
              <card.icon weight="BoldDuotone" size={38} color="#800020" />
              <h3 className="mt-5 text-[20px] font-bold tracking-[-0.02em]" style={{ color: '#1C1C1E' }}>
                {card.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed" style={{ color: 'rgba(60,60,67,0.75)' }}>
                {card.body}
              </p>
              <Link
                href="/signup"
                className="mt-5 inline-flex items-center gap-1 text-[14px] font-semibold"
                style={{ color: '#800020' }}
              >
                {card.cta} <ArrowRight weight="Linear" size={15} />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
