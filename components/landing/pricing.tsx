'use client'

import Link from 'next/link'
import { motion, type Variants } from 'motion/react'
import { serif } from '@/components/landing/fonts'

// Pricing — adapted from Spectrum UI "Serif Tiers": cream serif cards with a
// dark featured card lit by a glow (burgundy here). No monthly/yearly toggle:
// LexReg has no subscriptions, only priced services.

const ease = [0.16, 1, 0.3, 1] as const
const fadeUp: Variants = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.48, ease } } }
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

const PLANS = [
  // TODO(Charles): formation price.
  { name: 'Formation', tagline: 'Start a new company the right way.', price: 'On quote', unit: 'plus eCitizen fees', cta: 'Start a company', features: ['Every BRS form prepared for you', 'Name options and share structure', 'Certificate upload and activation'] },
  { name: 'Legal audit', tagline: 'Know where you stand before a bank or investor asks.', price: 'KES 25,000', unit: 'one-time, per entity', cta: 'Book a legal audit', featured: true, badge: 'Advocate signed', features: ['Statutory, tax, employment and data protection', 'Drafted by LexReg AI from your records', 'Checked and signed by an advocate'] },
  { name: 'Corporate services', tagline: 'Keep the company in good standing.', price: 'Per matter', unit: 'quoted before any work starts', cta: 'Request a quote', features: ['Minutes, notices and resolutions', 'Statutory filings and register updates', 'Annual return reminders'] },
]

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={`size-3.5 shrink-0 ${className ?? ''}`}>
      <path d="M8 0c.6 4.4 3 6.8 8 8-5 1.2-7.4 3.6-8 8-.6-4.4-3-6.8-8-8 5-1.2 7.4-3.6 8-8Z" fill="currentColor" />
    </svg>
  )
}

export function Pricing() {
  return (
    <section id="pricing" aria-labelledby="price-title">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:py-16 lg:px-8 lg:py-20 xl:px-16">
        <motion.div className="rounded-[28px] bg-[#fbfaf7] px-5 py-12 sm:px-8" initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={stagger}>
          <motion.div variants={fadeUp} className="flex flex-col items-center text-center">
            <span className="rounded-full bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.1em] text-stone-600 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)]">Pricing</span>
            <h2 id="price-title" className={`${serif.className} mt-6 max-w-[20ch] text-balance text-4xl font-normal leading-[1.1] tracking-tight text-stone-900 sm:text-5xl`}>
              Free to run. Pay only for the work.
            </h2>
            <p className="mt-4 max-w-[46ch] text-pretty text-base leading-relaxed text-stone-600">
              Your dashboard, registers, reminders and LexReg AI cost nothing. You pay when a lawyer does work for you, and you see the price first.
            </p>
          </motion.div>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {PLANS.map((p) => (
              <motion.article key={p.name} variants={fadeUp} className={`relative flex flex-col overflow-hidden rounded-3xl p-8 ${p.featured ? 'bg-[#140a0d] text-white shadow-[0_28px_60px_-28px_rgba(0,0,0,0.5)]' : 'bg-[#f5f2ec]'}`}>
                {p.featured && (
                  <>
                    <span aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-32 size-[300px] rounded-full bg-[#800020] opacity-80 blur-[90px]" />
                    <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-16 size-[140px] rounded-full bg-[#c2415d] opacity-60 blur-[70px]" />
                  </>
                )}
                <div className="relative flex flex-1 flex-col">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className={`${serif.className} m-0 text-3xl font-normal leading-none ${p.featured ? 'text-white' : 'text-stone-900'}`}>{p.name}</h3>
                    {p.badge && <span className="rounded-full bg-gradient-to-r from-[#c2415d] to-[#800020] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">{p.badge}</span>}
                  </div>
                  <p className={`mt-3 text-[15px] leading-normal ${p.featured ? 'text-stone-300' : 'text-stone-600'}`}>{p.tagline}</p>

                  <p className={`${serif.className} m-0 mt-10 text-4xl leading-none tracking-tight lg:text-[44px] ${p.featured ? 'text-white' : 'text-stone-900'}`}>{p.price}</p>
                  <p className={`mt-2 text-sm ${p.featured ? 'text-stone-400' : 'text-stone-500'}`}>{p.unit}</p>

                  <Link href="/signup" className={`mt-7 grid h-[52px] place-items-center rounded-full bg-white text-[15px] font-medium text-stone-900 shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.03)] transition-[transform,background-color] duration-150 hover:bg-[#faf9f6] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#800020] focus-visible:ring-offset-2`}>
                    {p.cta}
                  </Link>

                  <p className={`mt-8 text-sm ${p.featured ? 'text-stone-400' : 'text-stone-500'}`}>What&rsquo;s included</p>
                  <ul className="m-0 mt-4 list-none space-y-3.5 p-0">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-3">
                        <Star className={p.featured ? 'text-white' : 'text-[#800020]'} />
                        <span className={`text-[15px] leading-snug ${p.featured ? 'text-stone-200' : 'text-stone-800'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
