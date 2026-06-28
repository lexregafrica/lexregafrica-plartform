'use client'

import { motion } from 'motion/react'
import { ContainerScroll, CardSticky } from '@/components/ui/card-sticky'

const GOLD = '#C9A227'
const NAVY = '#1A1A2E'

const SERVICES = [
  {
    number: '01',
    title: 'Entity Formation & Registration',
    description:
      'We handle the complete formation journey — OCR extracts data from your documents automatically, a lawyer verifies everything, and we guide every BRS filing step by step.',
  },
  {
    number: '02',
    title: 'Corporate Services',
    description:
      'LexReg Diligence™ auto-generates every corporate document your company needs — board resolutions, AGM notices, director circulars, and share allotment forms, all legally accurate and ready to sign.',
  },
  {
    number: '03',
    title: 'Legal Audit & Risk Review',
    description:
      'A comprehensive health check across statutory, contractual, and regulatory obligations. Covers KRA tax, ELRC employment law, Data Protection Act 2019, and your contracts. Delivered in 5 working days.',
  },
  {
    number: '04',
    title: 'Document Vault',
    description:
      'Store, organise, and share your incorporation certificates, board minutes, and legal agreements — with role-based access so lawyers only see what they need.',
  },
  {
    number: '05',
    title: 'Secure Login & Role Management',
    description:
      'Business owners, lawyers, and admins each have a scoped view. Lawyers receive magic-link invites and can only access their assigned entity and service request.',
  },
]

const INCREMENT_Y = 72

export function ServicesSection() {
  return (
    <section id="services" className="relative px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">

          {/* Left — sticky descriptor */}
          <div className="md:sticky md:top-28 md:self-start">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="mb-4 text-xs font-semibold uppercase tracking-[0.15em]"
              style={{ color: GOLD, fontFamily: 'SF Pro Text, system-ui, sans-serif' }}
            >
              Our Services
            </motion.p>

            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.06 }}
              style={{
                fontFamily: 'SF Pro Display, system-ui, sans-serif',
                fontSize: 'clamp(28px, 3.5vw, 44px)',
                fontWeight: 700,
                color: NAVY,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
              }}
            >
              Everything your business needs to{' '}
              <span style={{ color: GOLD }}>stay compliant.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-5"
              style={{
                color: '#737373',
                fontSize: 'clamp(14px, 1.5vw, 16px)',
                lineHeight: 1.7,
                fontFamily: 'SF Pro Text, system-ui, sans-serif',
                maxWidth: '400px',
              }}
            >
              Three paid pillars plus document vault and access control — one platform
              built for Kenyan businesses from formation through governance.
            </motion.p>
          </div>

          {/* Right — sticky scroll card stack */}
          <div>
            <ContainerScroll>
              {SERVICES.map((service, i) => (
                <CardSticky
                  key={service.title}
                  index={i}
                  incrementY={INCREMENT_Y}
                  incrementZ={6}
                  className="mb-4"
                >
                  <div
                    className="w-full overflow-hidden rounded-2xl p-7"
                    style={{
                      background: 'rgba(255,255,255,0.82)',
                      backdropFilter: 'blur(18px)',
                      WebkitBackdropFilter: 'blur(18px)',
                      border: '1px solid rgba(0,0,0,0.07)',
                      boxShadow: '0 2px 24px rgba(0,0,0,0.06)',
                    }}
                  >
                    {/* Title row */}
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <h3
                        style={{
                          fontFamily: 'SF Pro Display, system-ui, sans-serif',
                          fontSize: 'clamp(17px, 1.8vw, 21px)',
                          fontWeight: 700,
                          color: NAVY,
                          letterSpacing: '-0.025em',
                          lineHeight: 1.25,
                        }}
                      >
                        {service.title}
                      </h3>
                      <span
                        className="shrink-0 text-2xl font-bold tabular-nums"
                        style={{
                          color: GOLD,
                          fontFamily: 'SF Pro Display, system-ui, sans-serif',
                          letterSpacing: '-0.04em',
                        }}
                      >
                        {service.number}
                      </span>
                    </div>

                    {/* Body */}
                    <p
                      style={{
                        color: '#4B5563',
                        fontSize: '14px',
                        fontFamily: 'SF Pro Text, system-ui, sans-serif',
                        lineHeight: 1.75,
                      }}
                    >
                      {service.description}
                    </p>
                  </div>
                </CardSticky>
              ))}
            </ContainerScroll>

            {/* Spacer so the stack clears before next section */}
            <div style={{ height: INCREMENT_Y * (SERVICES.length - 1) }} />
          </div>

        </div>
      </div>
    </section>
  )
}
