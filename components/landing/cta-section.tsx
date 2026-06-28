'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { IconArrowRight, IconCalendar } from '@tabler/icons-react'
import { ShimmerButton } from '@/components/ui/shimmer-button'

const GOLD = '#C9A227'
const ease: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function CTASection() {
  return (
    <section className="relative px-4 py-12 md:py-16">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease }}
          className="relative overflow-hidden rounded-3xl px-8 py-14 text-center md:px-16"
          style={{
            background: '#1A1A2E',
            border: '1px solid rgba(201,162,39,0.14)',
            boxShadow: '0 8px 48px rgba(0,0,0,0.18)',
          }}
        >
          {/* Gold radial glow — top-right */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-[0.12]"
            style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}
          />
          {/* Subtle grid dot overlay */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)`,
              backgroundSize: '28px 28px',
            }}
          />

          <div className="relative">
            {/* Eyebrow */}
            <p
              className="mb-4 text-xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: GOLD, fontFamily: 'SF Pro Text, system-ui, sans-serif' }}
            >
              Get started today
            </p>

            {/* Heading */}
            <h2
              className="mx-auto mb-5"
              style={{
                fontFamily: 'SF Pro Display, system-ui, sans-serif',
                fontSize: 'clamp(28px, 4.5vw, 52px)',
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.1,
                letterSpacing: '-0.035em',
                maxWidth: '640px',
              }}
            >
              Your business deserves to be compliant from day one.
            </h2>

            {/* Sub */}
            <p
              className="mx-auto mb-10"
              style={{
                color: 'rgba(255,255,255,0.52)',
                fontSize: 'clamp(14px, 1.6vw, 16px)',
                lineHeight: 1.65,
                fontFamily: 'SF Pro Text, system-ui, sans-serif',
                maxWidth: '420px',
              }}
            >
              Register your entity, generate corporate documents, or book a
              full legal audit — all in one platform built for Kenya.
            </p>

            {/* CTAs */}
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              {/* Primary */}
              <Link href="/signup">
                <ShimmerButton
                  background={GOLD}
                  shimmerColor="rgba(255,255,255,0.55)"
                  shimmerDuration="2.4s"
                  borderRadius="100px"
                  className="gap-2 px-7 py-3.5 text-sm font-semibold"
                  style={{ fontFamily: 'SF Pro Text, system-ui, sans-serif', letterSpacing: '-0.01em' }}
                >
                  Start for free
                  <IconArrowRight size={15} stroke={2.5} />
                </ShimmerButton>
              </Link>

              {/* Secondary */}
              <Link
                href="mailto:lexregafrica@gmail.com"
                className="group flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium transition-all duration-200 hover:bg-white/10"
                style={{
                  color: 'rgba(255,255,255,0.72)',
                  fontFamily: 'SF Pro Text, system-ui, sans-serif',
                  border: '1px solid rgba(255,255,255,0.14)',
                }}
              >
                <IconCalendar size={15} stroke={1.8} />
                Book a consultation
              </Link>
            </div>

            {/* Trust note */}
            <p
              className="mt-8"
              style={{
                color: 'rgba(255,255,255,0.28)',
                fontSize: '12px',
                fontFamily: 'SF Pro Text, system-ui, sans-serif',
              }}
            >
              No credit card required · Built for Kenya · Data stored in Frankfurt (EU-Central)
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
