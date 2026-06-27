'use client'

import { motion } from 'motion/react'
import {
  IconBuilding,
  IconFileText,
  IconShieldCheck,
  IconCheck,
  IconChevronDown,
} from '@tabler/icons-react'
import {
  Expandable,
  ExpandableTrigger,
  ExpandableContent,
} from '@/components/ui/expandable'

const GOLD = '#C9A227'
const NAVY = '#1A1A2E'
const ease: [number, number, number, number] = [0.16, 1, 0.3, 1]

const SERVICES = [
  {
    icon: IconBuilding,
    eyebrow: 'Pillar 1',
    title: 'Entity Formation & Registration',
    tagline: 'From idea to incorporated company.',
    description:
      'We handle the complete company formation journey — from BRS name search to certificate issuance. Document OCR extracts your data automatically, a lawyer verifies everything, and we guide the manual BRS filing step-by-step.',
    features: [
      'OCR with 60% confidence threshold',
      'Google Document AI + Gemini fallback',
      'Hybrid BRS filing workflow',
      'CR1, CR8, and director documents',
      'Certificate upload and storage',
    ],
    accentColor: GOLD,
  },
  {
    icon: IconFileText,
    eyebrow: 'Pillar 2',
    title: 'Corporate Services',
    tagline: 'Board resolutions and AGM notices in minutes.',
    description:
      'LexReg Diligence™ auto-generates the corporate documents your company needs to stay in good standing — board resolutions, AGM notices, share transfer forms, director circulars — all legally accurate and ready to sign.',
    features: [
      'Board resolutions',
      'AGM and EGM notices',
      'Director circulars',
      'Share allotment and transfer forms',
      'Dividend declaration documents',
    ],
    accentColor: '#2563eb',
  },
  {
    icon: IconShieldCheck,
    eyebrow: 'Pillar 3',
    title: 'Legal Audit & Risk Review',
    tagline: 'Know your exposure before it costs you.',
    description:
      "A comprehensive legal health check across all statutory, contractual, and regulatory obligations. Delivered as a written report within 5 working days — covering gaps most Kenyan SMEs don't know exist until it is too late.",
    features: [
      'Statutory compliance audit',
      'Tax obligations (KRA)',
      'Employment law (ELRC)',
      'Data protection (DPA 2019)',
      'IP, contracts & agreements',
    ],
    accentColor: '#059669',
  },
]

function ServiceCard({ service }: { service: (typeof SERVICES)[number] }) {
  const Icon = service.icon

  return (
    <Expandable transitionDuration={0.36} easeType={ease} className="w-full">
      {({ isExpanded }) => (
        <div
          className="w-full overflow-hidden rounded-3xl bg-white transition-shadow duration-300"
          style={{
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: isExpanded
              ? '0 8px 32px rgba(0,0,0,0.08)'
              : '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          {/* Only the header is the trigger */}
          <ExpandableTrigger className="w-full">
            <div className="flex items-start justify-between gap-4 p-7 pb-6">
              <div className="flex flex-col gap-3.5">
                {/* Bare icon — no background */}
                <Icon size={22} stroke={1.7} style={{ color: service.accentColor }} />

                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{
                    color: service.accentColor,
                    fontFamily: 'SF Pro Text, system-ui, sans-serif',
                  }}
                >
                  {service.eyebrow}
                </p>

                <h3
                  style={{
                    fontFamily: 'SF Pro Display, system-ui, sans-serif',
                    fontSize: 'clamp(17px, 1.8vw, 20px)',
                    fontWeight: 700,
                    color: NAVY,
                    letterSpacing: '-0.025em',
                    lineHeight: 1.2,
                  }}
                >
                  {service.title}
                </h3>

                <p
                  style={{
                    color: '#737373',
                    fontSize: '13px',
                    fontFamily: 'SF Pro Text, system-ui, sans-serif',
                    lineHeight: 1.5,
                  }}
                >
                  {service.tagline}
                </p>
              </div>

              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.3, ease }}
                className="mt-1 shrink-0"
              >
                <IconChevronDown
                  size={16}
                  stroke={2}
                  style={{ color: isExpanded ? service.accentColor : '#9CA3AF' }}
                />
              </motion.div>
            </div>
          </ExpandableTrigger>

          {/* Expandable content — outside the trigger */}
          <ExpandableContent preset="slide-up">
            <div className="px-7 pb-7">
              <div className="mb-5 h-px w-full" style={{ background: 'rgba(0,0,0,0.06)' }} />

              <p
                className="mb-5"
                style={{
                  color: '#4B5563',
                  fontSize: '13px',
                  fontFamily: 'SF Pro Text, system-ui, sans-serif',
                  lineHeight: 1.75,
                }}
              >
                {service.description}
              </p>

              <ul className="flex flex-col gap-2.5">
                {service.features.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <IconCheck size={13} stroke={2.5} style={{ color: service.accentColor, flexShrink: 0 }} />
                    <span
                      style={{
                        color: NAVY,
                        fontSize: '12px',
                        fontFamily: 'SF Pro Text, system-ui, sans-serif',
                      }}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </ExpandableContent>
        </div>
      )}
    </Expandable>
  )
}

export function ServicesSection() {
  return (
    <section id="services" className="relative px-4 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="mb-3 text-xs font-semibold uppercase tracking-[0.15em]"
            style={{ color: GOLD, fontFamily: 'SF Pro Text, system-ui, sans-serif' }}
          >
            Services
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease, delay: 0.06 }}
            style={{
              fontFamily: 'SF Pro Display, system-ui, sans-serif',
              fontSize: 'clamp(26px, 3.5vw, 40px)',
              fontWeight: 700,
              color: NAVY,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
            }}
          >
            Everything your business needs to stay compliant.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-3"
            style={{
              color: '#737373',
              fontSize: 'clamp(14px, 1.5vw, 16px)',
              lineHeight: 1.6,
              fontFamily: 'SF Pro Text, system-ui, sans-serif',
              maxWidth: '420px',
            }}
          >
            Three paid pillars. One platform. Built for Kenyan businesses from formation through governance.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.65, ease, delay: 0.08 }}
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          {SERVICES.map((service) => (
            <ServiceCard key={service.title} service={service} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
