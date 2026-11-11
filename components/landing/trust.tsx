'use client'

import { motion, type Variants } from 'motion/react'
import { ShieldCheck, Lock, ScrollText, Server, Signature, Landmark } from 'lucide-react'

// Security — adapted from Spectrum UI "Trust Center" (detailed variant):
// marks that state their scope. No invented certifications or customer logos.

const ease = [0.16, 1, 0.3, 1] as const
const fadeUp: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.48, ease } } }
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }

const MARKS = [
  { icon: ShieldCheck, label: 'Data Protection Act 2019', scope: 'Built around Kenya’s DPA: consent, purpose limits, and deleted records recoverable for 30 days before removal.' },
  { icon: Lock, label: 'Locked to your organisation', scope: 'Every record is fenced to your organisation at the database. A lawyer sees only the one entity they work on.' },
  { icon: ScrollText, label: 'Every action logged', scope: 'Who did what, and when, including every LexReg AI answer, is written to an audit log.' },
  { icon: Server, label: 'Hosted in the EU', scope: 'Data stored in Frankfurt. AI requests go out with data retention switched off.' },
  { icon: Signature, label: 'Advocate sign-off', scope: 'Nothing legal reaches you unchecked. Audit reports are reviewed and signed by an advocate.' },
  { icon: Landmark, label: 'Honest about BRS', scope: 'BRS has no public API. We prepare everything, you file on eCitizen, and we never claim a filing that isn’t on record.' },
]

export function Trust() {
  return (
    <section id="trust" aria-labelledby="trust-title">
      <motion.div className="mx-auto w-full max-w-7xl px-4 py-10 sm:py-16 lg:px-8 lg:py-20 xl:px-16" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={stagger}>
        <motion.div variants={fadeUp} className="max-w-[44ch]">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.09em] text-neutral-500">
            <ShieldCheck className="size-3.5 text-[#800020]" aria-hidden="true" />Security and privacy
          </span>
          <h2 id="trust-title" className="m-0 mt-3 text-balance text-3xl font-medium leading-tight tracking-tight text-neutral-900 xl:text-4xl">
            Your company records, kept the way a lawyer would keep them.
          </h2>
        </motion.div>

        <ul className="m-0 mt-10 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {MARKS.map(({ icon: Icon, label, scope }) => (
            <motion.li key={label} variants={fadeUp} className="flex h-full flex-col rounded-2xl border border-black/[0.08] bg-white px-5 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow] duration-200 hover:border-black/[0.14] hover:shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
              <span className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#800020]/8 text-[#800020]"><Icon className="size-[18px]" aria-hidden="true" /></span>
                <span className="text-[15px] font-medium text-neutral-900">{label}</span>
              </span>
              <span className="mt-3 text-pretty text-sm leading-relaxed text-neutral-600">{scope}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </section>
  )
}
