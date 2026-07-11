'use client'

import Link from 'next/link'
import { motion } from 'motion/react'

const EASE = [0.16, 1, 0.3, 1] as const

export function IosCta() {
  return (
    <section className="px-4 pb-24 pt-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: EASE }}
        className="mx-auto max-w-6xl rounded-[28px] px-6 py-20 text-center md:py-24"
        style={{ background: '#800020' }}
      >
        <h2
          className="font-bold text-white"
          style={{ fontSize: 'clamp(30px, 4vw, 44px)', letterSpacing: '-0.03em' }}
        >
          Ready to make it official?
        </h2>
        <p className="mt-4 text-[17px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
          Start free. Pay only when you form your entity.
        </p>
        <Link
          href="/signup"
          className="mt-9 inline-block rounded-full bg-white px-9 py-4 text-[17px] font-bold transition-opacity hover:opacity-90"
          style={{ color: '#800020' }}
        >
          Start Registration →
        </Link>
      </motion.div>
    </section>
  )
}
