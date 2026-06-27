'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import {
  IconArrowRight,
  IconClock,
  IconShieldCheck,
  IconBuilding,
  IconScale,
  IconFingerprint,
  IconReceipt,
} from '@tabler/icons-react'
import { TextAnimate } from '@/components/ui/text-animate'
import type { Insight } from '@/lib/sanity/queries'

const GOLD = '#C9A227'
const NAVY = '#1A1A2E'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Registration: <IconBuilding size={20} stroke={1.5} />,
  Governance: <IconShieldCheck size={20} stroke={1.5} />,
  'Data & Privacy': <IconFingerprint size={20} stroke={1.5} />,
  Compliance: <IconReceipt size={20} stroke={1.5} />,
  Legal: <IconScale size={20} stroke={1.5} />,
}

const CATEGORY_COLORS: Record<string, string> = {
  Registration: GOLD,
  Governance: '#2563eb',
  'Data & Privacy': '#7c3aed',
  Compliance: '#16a34a',
  Legal: '#dc2626',
  Tax: '#ea580c',
}

function CategoryBadge({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] ?? GOLD
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
      style={{ background: `${color}18`, color }}
    >
      {category}
    </span>
  )
}

function ReadTime({ minutes }: { minutes: number }) {
  return (
    <span
      className="flex items-center gap-1 text-[11px]"
      style={{ color: '#737373', fontFamily: 'SF Pro Text, system-ui, sans-serif' }}
    >
      <IconClock size={12} stroke={1.5} />
      {minutes} min read
    </span>
  )
}

const cardBase = {
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: '20px',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  overflow: 'hidden' as const,
  cursor: 'pointer',
}

function FeaturedCard({ insight }: { insight: Insight }) {
  return (
    <Link href={`/insights/${insight.slug.current}`} className="block h-full">
      <motion.div
        whileHover={{ scale: 1.008 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex h-full flex-col justify-between p-7 md:p-9"
        style={{
          ...cardBase,
          background: 'rgba(26, 26, 46, 0.90)',
          border: `1px solid rgba(201, 162, 39, 0.18)`,
          minHeight: 320,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-[0.07]"
          style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}
        />

        <div className="relative space-y-4">
          <div className="flex items-center justify-between">
            <CategoryBadge category={insight.category} />
            <ReadTime minutes={insight.readTime} />
          </div>

          <h3
            className="leading-tight"
            style={{
              fontFamily: 'SF Pro Display, system-ui, sans-serif',
              fontSize: 'clamp(20px, 2.4vw, 28px)',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.025em',
            }}
          >
            {insight.title}
          </h3>

          <p
            className="leading-relaxed"
            style={{
              fontFamily: 'SF Pro Text, system-ui, sans-serif',
              fontSize: '14px',
              color: 'rgba(255,255,255,0.60)',
              maxWidth: '52ch',
            }}
          >
            {insight.summary}
          </p>
        </div>

        <div className="relative mt-6 flex items-center gap-2">
          <span
            className="text-sm font-medium"
            style={{ color: GOLD, fontFamily: 'SF Pro Text, system-ui, sans-serif' }}
          >
            Read article
          </span>
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full"
            style={{ background: `${GOLD}22` }}
          >
            <IconArrowRight size={13} stroke={2} style={{ color: GOLD }} />
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

function SmallCard({ insight, tint = false }: { insight: Insight; tint?: boolean }) {
  const icon = CATEGORY_ICONS[insight.category]
  return (
    <Link href={`/insights/${insight.slug.current}`} className="block h-full">
      <motion.div
        whileHover={{ scale: 1.012 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="flex h-full flex-col justify-between p-5"
        style={{
          ...cardBase,
          background: tint ? 'rgba(201, 162, 39, 0.06)' : 'rgba(255, 255, 255, 0.72)',
          border: tint
            ? '1px solid rgba(201, 162, 39, 0.16)'
            : '1px solid rgba(255,255,255,0.5)',
        }}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <CategoryBadge category={insight.category} />
            {icon && (
              <span
                className="flex-shrink-0"
                style={{ color: CATEGORY_COLORS[insight.category] ?? GOLD, opacity: 0.7 }}
              >
                {icon}
              </span>
            )}
          </div>

          <h3
            className="leading-snug"
            style={{
              fontFamily: 'SF Pro Display, system-ui, sans-serif',
              fontSize: '15px',
              fontWeight: 650,
              color: NAVY,
              letterSpacing: '-0.018em',
            }}
          >
            {insight.title}
          </h3>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <ReadTime minutes={insight.readTime} />
          <IconArrowRight size={14} stroke={1.5} style={{ color: '#737373' }} />
        </div>
      </motion.div>
    </Link>
  )
}

function WideCard({ insight }: { insight: Insight }) {
  return (
    <Link href={`/insights/${insight.slug.current}`} className="block h-full">
      <motion.div
        whileHover={{ scale: 1.008 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="flex h-full flex-col justify-between p-5 md:flex-row md:items-center md:gap-6"
        style={{
          ...cardBase,
          background: 'rgba(26, 26, 46, 0.82)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <div className="space-y-2 md:flex-1">
          <CategoryBadge category={insight.category} />
          <h3
            className="leading-snug"
            style={{
              fontFamily: 'SF Pro Display, system-ui, sans-serif',
              fontSize: 'clamp(14px, 1.4vw, 16px)',
              fontWeight: 650,
              color: '#fff',
              letterSpacing: '-0.018em',
            }}
          >
            {insight.title}
          </h3>
          <p
            className="hidden text-sm leading-relaxed md:block"
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontFamily: 'SF Pro Text, system-ui, sans-serif',
            }}
          >
            {insight.summary}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-3 md:mt-0 md:flex-col md:items-end md:gap-2">
          <ReadTime minutes={insight.readTime} />
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: `${GOLD}1A` }}
          >
            <IconArrowRight size={14} stroke={2} style={{ color: GOLD }} />
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

export function InsightsBentoGrid({ insights }: { insights: Insight[] }) {
  const [featured, card2, card3, card4, card5] = insights

  return (
    <section className="relative py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="mb-3 text-xs font-semibold uppercase tracking-[0.15em]"
              style={{ color: GOLD, fontFamily: 'SF Pro Text, system-ui, sans-serif' }}
            >
              Insights
            </motion.p>

            <TextAnimate
              as="h2"
              animation="blurInUp"
              by="word"
              delay={0.08}
              duration={0.55}
              startOnView
              style={{
                fontFamily: 'SF Pro Display, system-ui, sans-serif',
                fontSize: 'clamp(26px, 3.5vw, 40px)',
                fontWeight: 700,
                color: NAVY,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
              }}
            >
              From Kenya&apos;s governance frontier
            </TextAnimate>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link
              href="/insights"
              className="flex flex-shrink-0 items-center gap-1.5 text-sm font-medium"
              style={{ color: GOLD, fontFamily: 'SF Pro Text, system-ui, sans-serif' }}
            >
              View all insights
              <IconArrowRight size={15} stroke={2} />
            </Link>
          </motion.div>
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
        >
          {featured && (
            <motion.div
              variants={fadeUp}
              className="relative md:[grid-column:1/3] md:[grid-row:1/3]"
            >
              <FeaturedCard insight={featured} />
            </motion.div>
          )}

          {card2 && (
            <motion.div variants={fadeUp} className="md:[grid-column:3/4] md:[grid-row:1/2]">
              <SmallCard insight={card2} />
            </motion.div>
          )}

          {card3 && (
            <motion.div variants={fadeUp} className="md:[grid-column:3/4] md:[grid-row:2/3]">
              <SmallCard insight={card3} tint />
            </motion.div>
          )}

          {card4 && (
            <motion.div variants={fadeUp} className="md:[grid-column:1/2] md:[grid-row:3/4]">
              <SmallCard insight={card4} />
            </motion.div>
          )}

          {card5 && (
            <motion.div variants={fadeUp} className="md:[grid-column:2/4] md:[grid-row:3/4]">
              <WideCard insight={card5} />
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
