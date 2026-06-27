'use client'

import Link from 'next/link'
import { IconBrandLinkedin, IconBrandX } from '@tabler/icons-react'
import { LexRegLogoMark } from '@/components/ui/lexreg-logo'

function Tape({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg
        width="128"
        height="38"
        viewBox="0 0 128 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="128" height="38" rx="2" fill="#222222" />
        <rect x="0" y="6.5" width="128" height="0.75" fill="rgba(255,255,255,0.07)" />
        <rect x="0" y="31" width="128" height="0.75" fill="rgba(255,255,255,0.07)" />
      </svg>
    </div>
  )
}

const NAV_COLUMNS = [
  {
    title: 'Services',
    links: [
      { label: 'Entity Formation', href: '#services', soon: false },
      { label: 'Corporate Services', href: '#services', soon: false },
      { label: 'Legal Audit', href: '#services', soon: false },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'Dashboard', href: '/dashboard', soon: true },
      { label: 'Document Vault', href: '/dashboard', soon: true },
      { label: 'Compliance Calendar', href: '/dashboard', soon: true },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about', soon: false },
      { label: 'Contact', href: 'mailto:hello@lexreg.africa', soon: false },
      { label: 'Privacy Policy', href: '/legal/privacy', soon: false },
    ],
  },
]

export function FooterSection() {
  const year = new Date().getFullYear()

  return (
    <footer
      className="px-4 pb-10 pt-16"
      style={{ fontFamily: 'SF Pro Text, system-ui, sans-serif' }}
    >
      <div className="relative mx-auto max-w-5xl">
        {/* Tape decorations — hang above the card top edge */}
        <Tape className="absolute -top-[19px] left-[8%] z-10 -rotate-3" />
        <Tape className="absolute -top-[19px] right-[8%] z-10 rotate-3" />

        {/* White card */}
        <div
          className="relative overflow-hidden rounded-3xl bg-white"
          style={{ border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}
        >
          {/* Main row: brand + nav */}
          <div className="flex flex-col gap-10 px-8 py-10 md:flex-row md:justify-between">
            {/* Brand */}
            <div className="flex max-w-[210px] flex-col gap-4">
              <Link href="/" className="flex items-center gap-2.5">
                <LexRegLogoMark size={26} />
                <span
                  style={{
                    fontFamily: 'SF Pro Display, system-ui, sans-serif',
                    color: '#1A1A2E',
                    fontSize: '15px',
                    fontWeight: 600,
                    letterSpacing: '-0.3px',
                  }}
                >
                  LexReg Africa
                </span>
              </Link>
              <p style={{ color: '#737373', fontSize: '13px', lineHeight: 1.65 }}>
                Governance, compliance, and legal OS for Kenyan businesses.
              </p>
            </div>

            {/* Nav columns */}
            <div className="flex flex-wrap gap-10 md:gap-14">
              {NAV_COLUMNS.map((col) => (
                <div key={col.title} className="flex flex-col gap-3">
                  <p
                    style={{
                      color: '#1A1A2E',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {col.title}
                  </p>
                  {col.links.map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="group flex items-center gap-2"
                    >
                      <span
                        className="transition-colors duration-150 group-hover:text-[#1A1A2E]"
                        style={{ color: '#737373', fontSize: '13px' }}
                      >
                        {link.label}
                      </span>
                      {link.soon && (
                        <span
                          style={{
                            background: '#F2F2F2',
                            color: '#9CA3AF',
                            fontSize: '10px',
                            fontWeight: 500,
                            padding: '1px 7px',
                            borderRadius: '999px',
                          }}
                        >
                          soon
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom bar: copyright + legal + socials */}
          <div
            className="flex flex-col gap-4 px-8 py-5 md:flex-row md:items-center md:justify-between"
            style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
          >
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-5">
              <p style={{ color: '#B0B0B0', fontSize: '12px' }}>
                © {year} LexReg Africa. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <Link
                  href="/legal/privacy"
                  className="transition-colors duration-150 hover:text-[#1A1A2E]"
                  style={{ color: '#B0B0B0', fontSize: '12px' }}
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/legal/terms"
                  className="transition-colors duration-150 hover:text-[#1A1A2E]"
                  style={{ color: '#B0B0B0', fontSize: '12px' }}
                >
                  Terms of Service
                </Link>
              </div>
            </div>

            {/* Social icons */}
            <div className="flex items-center gap-2">
              <a
                href="https://linkedin.com/company/lexreg-africa"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LexReg Africa on LinkedIn"
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5F5F5]"
                style={{ background: '#F5F5F5' }}
              >
                <IconBrandLinkedin size={15} stroke={1.5} style={{ color: '#737373' }} />
              </a>
              <a
                href="https://x.com/lexregafrica"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LexReg Africa on X"
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 hover:bg-[#F5F5F5]"
                style={{ background: '#F5F5F5' }}
              >
                <IconBrandX size={15} stroke={1.5} style={{ color: '#737373' }} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
