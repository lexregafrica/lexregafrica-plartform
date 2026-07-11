'use client'

import Link from 'next/link'
import { LexRegLogoMark } from '@/components/ui/lexreg-logo'

const LINKS = [
  { label: 'Services', href: '#services' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
]

export function IosNavbar() {
  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        className="flex w-full max-w-3xl items-center justify-between rounded-full border bg-white/85 py-2 pl-5 pr-2 backdrop-blur-xl"
        style={{ borderColor: 'rgba(60,60,67,0.12)' }}
      >
        <Link href="/" className="flex items-center gap-2">
          <LexRegLogoMark className="h-6 w-6" />
          <span className="text-[17px] font-bold tracking-[-0.4px]" style={{ color: '#800020' }}>
            LexReg
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[14px] font-medium transition-colors hover:opacity-70"
              style={{ color: 'rgba(60,60,67,0.85)' }}
            >
              {link.label}
            </a>
          ))}
        </div>

        <Link
          href="/login"
          className="rounded-full px-5 py-2 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: '#800020' }}
        >
          Sign In
        </Link>
      </nav>
    </header>
  )
}
