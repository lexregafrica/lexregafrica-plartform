'use client'

import Link from 'next/link'
import { motion, type Variants } from 'motion/react'
import { ArrowRight, Building2, FileUp, Target, Check, ScanText } from 'lucide-react'

// "Three ways in" — the three onboarding paths, each with a small glimpse of
// what that path looks like in the product. Same language as the LexReg AI
// section: grey rounded panel, white cards, fade-up on scroll.

const ease = [0.16, 1, 0.3, 1] as const
const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } }
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }

function ReadGlimpse() {
  const rows = [
    { doc: 'CR12', field: 'Directors', value: '2 found', ok: true },
    { doc: 'Certificate', field: 'Reg. no.', value: 'PVT-2LU7Q9XB', ok: true },
    { doc: 'KRA PIN', field: 'PIN', value: 'Check this', ok: false },
  ]
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-neutral-100 p-3" aria-hidden="true">
      {rows.map((r) => (
        <div key={r.doc} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs shadow-[0_0_0_1px_rgba(0,0,0,0.05)]">
          <ScanText className="size-3.5 shrink-0 text-neutral-400" />
          <span className="font-medium text-neutral-800">{r.doc}</span>
          <span className="text-neutral-500">{r.field}</span>
          <span className={`ml-auto rounded-full px-2 py-0.5 font-medium ${r.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{r.value}</span>
        </div>
      ))}
    </div>
  )
}

function FormGlimpse() {
  const steps = ['Entity type', 'Applicant', 'Name options', 'Shares', 'Directors', 'Review']
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-neutral-100 p-3" aria-hidden="true">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2 text-xs">
          <span className={`grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${i < 3 ? 'bg-[#800020] text-white' : i === 3 ? 'bg-white text-[#800020] ring-1 ring-[#800020]' : 'bg-white text-neutral-400 ring-1 ring-neutral-200'}`}>
            {i < 3 ? <Check className="size-3" /> : i + 1}
          </span>
          <span className={i <= 3 ? 'font-medium text-neutral-800' : 'text-neutral-500'}>{s}</span>
        </div>
      ))}
    </div>
  )
}

function ScoreGlimpse() {
  const score = 64
  const c = 2 * Math.PI * 34
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-neutral-100 p-3" aria-hidden="true">
      <svg viewBox="0 0 80 80" className="size-20 shrink-0 -rotate-90">
        <circle cx="40" cy="40" r="34" fill="none" stroke="#e5e5e5" strokeWidth="8" />
        <circle cx="40" cy="40" r="34" fill="none" stroke="#800020" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} />
        <text x="40" y="46" textAnchor="middle" className="fill-neutral-900 text-[18px] font-semibold" transform="rotate(90 40 40)">{score}</text>
      </svg>
      <div className="flex min-w-0 flex-col gap-1 text-xs">
        <span className="font-medium text-neutral-800">Readiness score</span>
        <span className="text-neutral-500">Fix first: business permit, KRA PIN, separate bank account</span>
      </div>
    </div>
  )
}

const PATHS = [
  {
    icon: FileUp,
    step: '01',
    title: 'Already registered',
    body: 'Upload your CR12, certificate and IDs. We read them, you confirm anything we’re unsure of, and your registers and compliance calendar are ready.',
    points: ['Documents read for you', 'Nothing saved as fact until you confirm'],
    glimpse: <ReadGlimpse />,
  },
  {
    icon: Building2,
    step: '02',
    title: 'Starting a company',
    body: 'A guided questionnaire collects everything once. We prepare every form; you file on BRS eCitizen and upload the certificate. We take it from there.',
    points: ['Every BRS form prepared', 'Progress saved at every step'],
    glimpse: <FormGlimpse />,
  },
  {
    icon: Target,
    step: '03',
    title: 'Not registered yet',
    body: 'Take a 15-question readiness check. Get a score out of 100 and a plain list of what to fix before you formalise.',
    points: ['Free, about five minutes', 'Clear next steps, not jargon'],
    glimpse: <ScoreGlimpse />,
  },
]

export function ThreeWays() {
  return (
    <section id="paths" aria-labelledby="paths-title">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:py-16 lg:px-8 lg:py-20 xl:px-16">
        <motion.div className="mb-12 flex flex-col items-center gap-4 text-center" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={stagger}>
          <motion.span variants={fadeUp} className="inline-flex items-center rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-800">How it works</motion.span>
          <motion.h2 id="paths-title" variants={fadeUp} className="m-0 max-w-2xl text-3xl font-medium leading-tight tracking-tight text-neutral-900 xl:text-4xl">
            Three ways in, wherever your business is today
          </motion.h2>
          <motion.p variants={fadeUp} className="m-0 max-w-2xl text-base text-neutral-600 lg:text-xl">
            Pick the path that fits. Every step saves as you go, so you can stop and come back days later.
          </motion.p>
        </motion.div>

        <motion.ol className="m-0 grid list-none grid-cols-1 gap-2 rounded-3xl bg-neutral-100 p-2 md:grid-cols-3" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={stagger}>
          {PATHS.map(({ icon: Icon, step, title, body, points, glimpse }) => (
            <motion.li key={title} variants={fadeUp} className="flex flex-col gap-5 rounded-2xl bg-white p-6 md:p-8">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-full bg-[#800020]/8 text-[#800020]"><Icon className="size-5" aria-hidden="true" /></span>
                <span className="text-sm font-medium tabular-nums text-neutral-400">{step}</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="m-0 text-2xl font-medium leading-snug text-neutral-900">{title}</h3>
                <p className="m-0 text-base text-neutral-600">{body}</p>
              </div>
              {glimpse}
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-neutral-700"><Check className="size-4 shrink-0 text-[#800020]" aria-hidden="true" />{p}</li>
                ))}
              </ul>
              <Link href="/signup" className="mt-auto inline-flex items-center gap-1.5 self-start text-sm font-medium text-[#800020] hover:underline">
                Start here<ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  )
}
