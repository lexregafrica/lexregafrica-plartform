'use client'

import { motion, type Variants } from 'motion/react'
import {
  Briefcase, Building2, Rocket, Scale, Users, Landmark, HeartHandshake, Calculator, Store,
  CircleCheck, BookOpen, Gavel, FileSearch, Paperclip, ArrowUp, ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Marquee } from '@/components/ui/marquee'

// LexReg AI capabilities — adapted from the "Feature" two-row layout:
// image + marquee of who it serves, then what it does and why, then a chat
// card. Copy is LexReg's; the chat card is an illustration (not a live input).

type Tag = { icon: LucideIcon; label: string }

const row1: Tag[] = [
  { icon: Briefcase, label: 'Business owners' },
  { icon: Rocket, label: 'Founders' },
  { icon: Users, label: 'Directors' },
  { icon: Building2, label: 'SMEs' },
  { icon: Store, label: 'Sole proprietors' },
]
const row2: Tag[] = [
  { icon: Scale, label: 'Advocates' },
  { icon: Landmark, label: 'Company secretaries' },
  { icon: Calculator, label: 'Accountants' },
  { icon: HeartHandshake, label: 'NGOs and societies' },
]
const row3: Tag[] = [
  { icon: Users, label: 'Partnerships and LLPs' },
  { icon: Building2, label: 'Family businesses' },
  { icon: Rocket, label: 'Start-ups' },
  { icon: Briefcase, label: 'Business owners' },
]

const TagChip = ({ icon: Icon, label }: Tag) => (
  <div className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-4">
    <Icon className="size-4 text-white" aria-hidden="true" />
    <span className="whitespace-nowrap text-sm font-medium text-white">{label}</span>
  </div>
)

const ease = [0.16, 1, 0.3, 1] as const
const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } }
const fadeLeft: Variants = { hidden: { opacity: 0, x: -30 }, show: { opacity: 1, x: 0, transition: { duration: 0.6, ease } } }
const fadeRight: Variants = { hidden: { opacity: 0, x: 30 }, show: { opacity: 1, x: 0, transition: { duration: 0.6, ease } } }
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }

function Points({ items, from }: { items: { title: string; body: string }[]; from: Variants }) {
  return (
    <motion.ul variants={stagger} className="m-0 flex list-none flex-col gap-3 p-0">
      {items.map(({ title, body }) => (
        <motion.li key={title} variants={from} className="flex items-start gap-3">
          <CircleCheck className="mt-0.5 size-5 shrink-0 text-[#800020]" aria-hidden="true" />
          <p className="m-0 text-base text-neutral-600">
            <span className="font-medium text-neutral-900">{title}: </span>
            {body}
          </p>
        </motion.li>
      ))}
    </motion.ul>
  )
}

export function AiCapabilities() {
  return (
    <section id="ai" aria-labelledby="ai-title">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:py-16 lg:px-8 lg:py-20 xl:px-16">
        <div className="flex flex-col gap-5">
          <motion.div className="mb-7 flex flex-col items-center gap-4 text-center" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={stagger}>
            <motion.span variants={fadeUp} className="inline-flex h-auto items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-800">
              <ShieldCheck className="size-4 text-[#800020]" aria-hidden="true" />LexReg AI
            </motion.span>
            <motion.h2 id="ai-title" variants={fadeUp} className="m-0 max-w-2xl text-3xl font-medium leading-tight tracking-tight text-neutral-900 xl:text-4xl">
              Answers from your own records. Signed by an advocate.
            </motion.h2>
            <motion.p variants={fadeUp} className="m-0 max-w-2xl text-base text-neutral-600 lg:text-xl">
              Compliance work is mostly finding the right fact in the right document. LexReg AI does the finding, so you, and your lawyer, spend time on decisions instead.
            </motion.p>
          </motion.div>

          {/* Row 1: who it serves + why */}
          <div className="flex flex-col gap-0 overflow-hidden rounded-3xl bg-neutral-100 p-2 md:flex-row">
            <motion.div className="relative h-72 min-h-[300px] shrink-0 overflow-hidden rounded-2xl md:h-auto md:w-1/2" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fadeLeft}>
              {/* eslint-disable-next-line @next/next/no-img-element -- image from the feature snippet */}
              <img src="https://cdn.21st.dev/assets/localized/468033ba9511428e13bf900759fb694f10d1ed1bf588879f76dc9a183273ce5a.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-neutral-900/20" />
              <div className="absolute inset-0 flex flex-col justify-center gap-4 py-10" aria-label="Who LexReg AI helps">
                <Marquee className="p-0 [--duration:20s] [--gap:0.75rem]">{row1.map((t) => <TagChip key={t.label} {...t} />)}</Marquee>
                <Marquee reverse className="p-0 [--duration:16s] [--gap:0.75rem]">{row2.map((t) => <TagChip key={t.label} {...t} />)}</Marquee>
                <Marquee className="p-0 [--duration:22s] [--gap:0.75rem]">{row3.map((t) => <TagChip key={t.label} {...t} />)}</Marquee>
              </div>
            </motion.div>

            <motion.div className="flex flex-1 flex-col justify-center gap-8 p-8 md:p-10" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
              <motion.div variants={fadeRight} className="flex flex-col gap-3">
                <h3 className="m-0 text-2xl font-medium leading-snug text-neutral-900">Why LexReg has AI</h3>
                <p className="m-0 text-base text-neutral-600">
                  Most businesses don&rsquo;t miss filings out of carelessness; the facts are spread across a CR12, a KRA certificate, a share register and a dozen emails. Lawyers spend paid hours just reading them.
                </p>
              </motion.div>
              <Points
                from={fadeRight}
                items={[
                  { title: 'Fewer surprises', body: 'Gaps like a missing BOF-1 or a KRA PIN that doesn’t match the CR12 surface before the Registrar or a bank finds them.' },
                  { title: 'Lower legal cost', body: 'Your advocate starts from a sourced draft instead of a blank page, so their time goes on judgement, not reading.' },
                ]}
              />
            </motion.div>
          </div>

          {/* Row 2: what it does + chat card */}
          <div className="flex flex-col gap-0 overflow-hidden rounded-3xl bg-neutral-100 p-2 md:flex-row">
            <motion.div className="flex flex-1 flex-col justify-center gap-8 p-8 md:p-10" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
              <motion.div variants={fadeLeft} className="flex flex-col gap-3">
                <h3 className="m-0 text-2xl font-medium leading-snug text-neutral-900">What it can do</h3>
                <p className="m-0 text-base text-neutral-600">It reads only the entity you ask about, names its source for every fact, and says &ldquo;not on file&rdquo; rather than guess.</p>
              </motion.div>
              <Points
                from={fadeLeft}
                items={[
                  { title: 'Ask your filings', body: '“When is our annual return due?” “Who holds more than 10%?” Answered from your registers and documents, with sources.' },
                  { title: 'Draft a legal audit', body: 'Each checklist item drafted from your records, then checked, edited and signed by an advocate before you see it. KES 25,000.' },
                  { title: 'Brief your lawyer', body: 'Your assigned advocate gets a pre-flight briefing of gaps to raise with you. Never shown to anyone else.' },
                ]}
              />
            </motion.div>

            <motion.div className="relative h-80 min-h-[320px] shrink-0 overflow-hidden rounded-2xl md:h-auto md:w-1/2" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fadeRight}>
              {/* eslint-disable-next-line @next/next/no-img-element -- image from the feature snippet */}
              <img src="https://cdn.21st.dev/assets/localized/9c63a565817f73c372e52a92c50bfa44a631f64ad8fde1e9fd398f5ff073dd5e.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-neutral-900/20" />
              {/* Illustration of the LexReg AI box — not a live input */}
              <div className="absolute inset-0 flex items-center justify-center px-6" aria-hidden="true">
                <div className="flex w-full max-w-md flex-col gap-3 rounded-3xl bg-gray-950/20 px-2 py-2.5 backdrop-blur-sm sm:p-4">
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {[{ icon: BookOpen, label: 'Ask your filings' }, { icon: Gavel, label: 'Draft legal audit' }, { icon: FileSearch, label: 'Brief my lawyer' }].map(({ icon: Icon, label }) => (
                      <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200/40 bg-white/20 px-2 py-1.5 text-xs text-white xl:px-4 xl:py-2">
                        <Icon className="size-3.5" />{label}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 shadow-sm">
                    <Paperclip className="size-4 shrink-0 text-white" />
                    <span className="flex-1 truncate text-sm text-white">Is anything missing before we file our annual return?</span>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[#800020]"><ArrowUp className="size-4" /></span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
