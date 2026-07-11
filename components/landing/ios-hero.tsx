'use client'

import Link from 'next/link'
import { motion } from 'motion/react'

const EASE = [0.16, 1, 0.3, 1] as const

export function IosHero() {
  return (
    <section className="px-4 pb-24 pt-40 text-center md:pt-48">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mx-auto inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2"
        style={{ borderColor: 'rgba(60,60,67,0.12)' }}
      >
        <span className="text-[13px] font-semibold" style={{ color: '#800020' }}>
          ⚖ Built for Kenya&apos;s Business Registration Service
        </span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
        className="mx-auto mt-8 max-w-4xl font-bold"
        style={{
          fontSize: 'clamp(40px, 6.5vw, 72px)',
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          color: '#1C1C1E',
        }}
      >
        Business registration.
        <br />
        <span style={{ color: '#800020' }}>Finally simple.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
        className="mx-auto mt-6 max-w-xl font-medium"
        style={{ fontSize: 'clamp(17px, 2vw, 20px)', lineHeight: 1.5, color: 'rgba(60,60,67,0.75)' }}
      >
        Form your entity, stay compliant, and get audited — all from one place,
        built for Kenya.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.3 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-4"
      >
        <Link
          href="/signup"
          className="rounded-full px-8 py-4 text-[17px] font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: '#800020' }}
        >
          Start Registration
        </Link>
        <a
          href="#how-it-works"
          className="rounded-full border bg-white px-8 py-4 text-[17px] font-semibold transition-colors hover:bg-neutral-50"
          style={{ borderColor: 'rgba(60,60,67,0.12)', color: '#800020' }}
        >
          Learn more
        </a>
      </motion.div>
    </section>
  )
}
