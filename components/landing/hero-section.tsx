'use client'

import { motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { IconLayoutGrid, IconBriefcase, IconHelp } from '@tabler/icons-react'
import Cloudscape from '@/components/forgeui/cloudscape'
import { KineticText } from '@/components/ui/kinetic-text'
import { ShinyButton } from '@/components/ui/shiny-button'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { NotchNavbar } from '@/components/ui/notch-navbar'

const ease: [number, number, number, number] = [0.16, 1, 0.3, 1]

const navItems = [
  { name: 'How it works', link: '#how-it-works', icon: <IconLayoutGrid className="h-4 w-4" /> },
  { name: 'Services',     link: '#services',     icon: <IconBriefcase className="h-4 w-4" /> },
  { name: 'FAQs',         link: '#faq',           icon: <IconHelp className="h-4 w-4" /> },
]

export function HeroSection() {
  const reduce = useReducedMotion()

  return (
    <>
      {/* Notch nav — fixed, always visible */}
      <NotchNavbar />

      <section className="relative min-h-[100dvh]">
        {/* Cloudscape full-bleed background */}
        <div className="absolute inset-0 z-0 h-full w-full">
          <Cloudscape
            colorBottom="#87ceeb"
            colorMid="#f8f8f8"
            colorTop="#ffffff"
            speed={1}
            height="100%"
            className="h-full w-full"
          />
        </div>

        {/* Hero body — full viewport, content centered below fixed nav */}
        <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 pb-20 pt-[72px] text-center">

          {/* Eyebrow badge — ShinyButton with gold sweep */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease, delay: 0.08 }}
            className="mb-8"
          >
            <ShinyButton
              className="rounded-full border-black/10 bg-white/75 px-4 py-[7px] [&>span:first-child]:normal-case [&>span:first-child]:tracking-[-0.12px] [&>span:first-child]:text-[13px]"
              style={{ '--primary': '#C9A227' } as React.CSSProperties}
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className="inline-block h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{ backgroundColor: '#C9A227' }}
                />
                <span style={{ fontFamily: 'SF Pro Text, var(--font-geist-sans), system-ui, sans-serif' }}>
                  Governance OS for Kenyan businesses
                </span>
              </span>
            </ShinyButton>
          </motion.div>

          {/* Display headline — KineticText per line */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease, delay: 0.18 }}
            className="mb-5 flex flex-col items-center"
            style={{
              fontFamily: 'SF Pro Display, var(--font-geist-sans), system-ui, -apple-system, sans-serif',
              fontSize: 'clamp(42px, 7vw, 68px)',
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: '#1A1A2E',
            }}
          >
            <KineticText
              text="Start strong."
              as="h1"
              className="justify-center"
              style={{ fontSize: 'inherit', lineHeight: 'inherit', letterSpacing: 'inherit', color: 'inherit' }}
            />
            <KineticText
              text="Stay compliant."
              as="h1"
              className="justify-center"
              style={{ fontSize: 'inherit', lineHeight: 'inherit', letterSpacing: 'inherit', color: 'inherit' }}
            />
          </motion.div>

          {/* Sub-copy — 17px, max 20 words */}
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.3 }}
            className="mb-10"
            style={{
              fontFamily: 'SF Pro Text, var(--font-geist-sans), system-ui, -apple-system, sans-serif',
              fontSize: '17px',
              fontWeight: 400,
              lineHeight: 1.47,
              letterSpacing: '-0.374px',
              color: '#333333',
              maxWidth: '440px',
            }}
          >
            Register, comply, and govern your Kenyan business from formation through legal audit.
          </motion.p>

          {/* CTA group */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.42 }}
            className="flex items-center gap-3"
          >
            {/* Primary — ShimmerButton: navy + gold shimmer */}
            <Link href="/signup">
              <ShimmerButton
                background="#1A1A2E"
                shimmerColor="#C9A227"
                shimmerDuration="2.5s"
                className="px-6 py-[10px] text-[15px] font-medium tracking-[-0.224px]"
                style={{ fontFamily: 'SF Pro Text, var(--font-geist-sans), system-ui, sans-serif' }}
              >
                Get started
              </ShimmerButton>
            </Link>

            {/* Secondary — frosted glass ghost pill, matched size */}
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-full transition-transform active:scale-95"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.68)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(26, 26, 46, 0.18)',
                color: '#1A1A2E',
                fontSize: '15px',
                fontWeight: 500,
                letterSpacing: '-0.224px',
                padding: '10px 24px',
                fontFamily: 'SF Pro Text, var(--font-geist-sans), system-ui, sans-serif',
              }}
            >
              How it works
            </a>
          </motion.div>
        </div>
      </section>
    </>
  )
}
