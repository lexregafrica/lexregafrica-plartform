'use client'

import { motion } from 'motion/react'
import {
  IconBuilding,
  IconFileText,
  IconShieldCheck,
  IconFolder,
  IconLock,
  IconCheck,
} from '@tabler/icons-react'
import { ContainerScroll, CardSticky } from '@/components/ui/card-sticky'

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
      'We handle the complete formation journey — OCR extracts data from your documents automatically, a lawyer verifies everything, and we guide every BRS filing step by step.',
    features: [
      'OCR with 60% confidence threshold',
      'Google Document AI + Gemini fallback',
      'Hybrid BRS filing workflow',
      'CR1, CR8, and director documents',
      'Certificate upload and storage',
    ],
    accentColor: GOLD,
    accentBg: 'rgba(201,162,39,0.07)',
    accentBorder: 'rgba(201,162,39,0.18)',
  },
  {
    icon: IconFileText,
    eyebrow: 'Pillar 2',
    title: 'Corporate Services',
    tagline: 'Board resolutions and AGM notices in minutes.',
    description:
      'LexReg Diligence™ auto-generates every corporate document your company needs to stay in good standing — all legally accurate and ready to sign.',
    features: [
      'Board resolutions',
      'AGM and EGM notices',
      'Director circulars',
      'Share allotment and transfer forms',
      'Dividend declaration documents',
    ],
    accentColor: '#2563eb',
    accentBg: 'rgba(37,99,235,0.06)',
    accentBorder: 'rgba(37,99,235,0.16)',
  },
  {
    icon: IconShieldCheck,
    eyebrow: 'Pillar 3',
    title: 'Legal Audit & Risk Review',
    tagline: 'Know your exposure before it costs you.',
    description:
      'A comprehensive health check across all statutory, contractual, and regulatory obligations. Delivered as a written report within 5 working days.',
    features: [
      'Statutory compliance audit',
      'Tax obligations (KRA)',
      'Employment law (ELRC)',
      'Data protection (DPA 2019)',
      'IP, contracts & agreements',
    ],
    accentColor: '#059669',
    accentBg: 'rgba(5,150,105,0.06)',
    accentBorder: 'rgba(5,150,105,0.16)',
  },
  {
    icon: IconFolder,
    eyebrow: 'Document Vault',
    title: 'Secure Document Storage',
    tagline: 'Every company document, one secure place.',
    description:
      'Store, organise, and share your incorporation certificates, board minutes, and legal agreements — with role-based access so lawyers only see what they need.',
    features: [
      'Encrypted cloud storage',
      'Categorised by document type',
      'Share securely with assigned lawyers',
      'Full download and audit trail',
      'Kenya DPA 2019 compliant retention',
    ],
    accentColor: '#7c3aed',
    accentBg: 'rgba(124,58,237,0.06)',
    accentBorder: 'rgba(124,58,237,0.16)',
  },
  {
    icon: IconLock,
    eyebrow: 'Access Control',
    title: 'Secure Login & Role Management',
    tagline: 'Right access for the right people.',
    description:
      'Business owners, lawyers, and admins each have a scoped view. Lawyers receive magic-link invites and can only see their assigned entity and service request.',
    features: [
      'Magic-link lawyer invites',
      'Role-based access (owner / lawyer / admin)',
      'Full audit log of every action',
      'No shared passwords',
      'Supabase Auth — EU-Central data residency',
    ],
    accentColor: '#334155',
    accentBg: 'rgba(51,65,85,0.06)',
    accentBorder: 'rgba(51,65,85,0.16)',
  },
]

// How far each card peeks below the previous when stacked
const INCREMENT_Y = 72

export function ServicesSection() {
  return (
    <section id="services" className="relative px-4 py-20 md:py-28">
      <div className="mx-auto max-w-4xl">

        {/* Section header */}
        <div className="mb-16 text-center">
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
              maxWidth: '440px',
            }}
          >
            Three paid pillars plus document vault and access control — one platform,
            built for Kenyan businesses from formation through governance.
          </motion.p>
        </div>

        {/* Sticky scroll stack */}
        <ContainerScroll>
          {SERVICES.map((service, i) => {
            const Icon = service.icon
            return (
              <CardSticky
                key={service.title}
                index={i}
                incrementY={INCREMENT_Y}
                incrementZ={6}
                className="mb-4"
              >
                <div
                  className="w-full overflow-hidden rounded-3xl bg-white"
                  style={{
                    border: `1px solid ${service.accentBorder}`,
                    boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                  }}
                >
                  {/* Accent top bar */}
                  <div
                    className="h-1 w-full"
                    style={{ background: service.accentColor }}
                  />

                  <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
                    {/* Left — text */}
                    <div className="flex flex-col gap-4 p-7 md:p-8">
                      {/* Icon + eyebrow */}
                      <div className="flex items-center gap-3">
                        <Icon size={20} stroke={1.7} style={{ color: service.accentColor }} />
                        <span
                          className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                          style={{
                            color: service.accentColor,
                            fontFamily: 'SF Pro Text, system-ui, sans-serif',
                          }}
                        >
                          {service.eyebrow}
                        </span>
                      </div>

                      {/* Title */}
                      <h3
                        style={{
                          fontFamily: 'SF Pro Display, system-ui, sans-serif',
                          fontSize: 'clamp(18px, 2vw, 22px)',
                          fontWeight: 700,
                          color: NAVY,
                          letterSpacing: '-0.025em',
                          lineHeight: 1.2,
                        }}
                      >
                        {service.title}
                      </h3>

                      {/* Tagline */}
                      <p
                        style={{
                          color: service.accentColor,
                          fontSize: '13px',
                          fontFamily: 'SF Pro Text, system-ui, sans-serif',
                          fontWeight: 500,
                          lineHeight: 1.5,
                        }}
                      >
                        {service.tagline}
                      </p>

                      {/* Description */}
                      <p
                        style={{
                          color: '#4B5563',
                          fontSize: '13px',
                          fontFamily: 'SF Pro Text, system-ui, sans-serif',
                          lineHeight: 1.75,
                        }}
                      >
                        {service.description}
                      </p>
                    </div>

                    {/* Right — features */}
                    <div
                      className="flex flex-col justify-center gap-3 px-7 pb-7 md:px-8 md:py-8"
                      style={{ background: service.accentBg }}
                    >
                      <p
                        className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                        style={{
                          color: service.accentColor,
                          fontFamily: 'SF Pro Text, system-ui, sans-serif',
                        }}
                      >
                        What's included
                      </p>
                      <ul className="flex flex-col gap-2.5">
                        {service.features.map((f) => (
                          <li key={f} className="flex items-start gap-3">
                            <IconCheck
                              size={13}
                              stroke={2.5}
                              className="mt-0.5 shrink-0"
                              style={{ color: service.accentColor }}
                            />
                            <span
                              style={{
                                color: NAVY,
                                fontSize: '12.5px',
                                fontFamily: 'SF Pro Text, system-ui, sans-serif',
                                lineHeight: 1.5,
                              }}
                            >
                              {f}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </CardSticky>
            )
          })}
        </ContainerScroll>

        {/* Bottom spacer so last card clears the stack before next section */}
        <div style={{ height: INCREMENT_Y * (SERVICES.length - 1) }} />
      </div>
    </section>
  )
}
