'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Instrument_Serif } from 'next/font/google'
import { LexRegLogoMark } from '@/components/ui/lexreg-logo'

// Landing header + hero, adapted from the ResponsiveHeroBanner layout:
// full-bleed brand video (same as sign-in), glass pill navigation, badge,
// serif headline, two calls to action, and a row of what LexReg is built
// around. No partner logos: LexReg has no partnerships to claim.

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', display: 'swap' })

const NAV = [
  { label: 'How it works', href: '#paths' },
  { label: 'LexReg AI', href: '#ai' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Security', href: '#trust' },
  { label: 'FAQ', href: '#faq' },
]

const BUILT_AROUND = ['Companies Act 2015', 'BRS eCitizen', 'KRA', 'Data Protection Act 2019', 'Advocate sign-off']

const Arrow = ({ d }: { d: string[] }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
    {d.map((p) => <path key={p} d={p} />)}
  </svg>
)

export function HeroBanner() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <section className="hero-banner relative isolate w-full overflow-hidden" aria-labelledby="hero-title">
      <video className="hero-video absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline preload="auto" poster="/videos/auth-bg-poster.jpg" aria-hidden="true">
        <source src="/videos/auth-bg.webm" type="video/webm" />
        <source src="/videos/auth-bg.mp4" type="video/mp4" />
      </video>
      {/* Scrim keeps white text readable over every frame of the video */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/70" />

      <header className="relative z-10 xl:top-4">
        <div className="mx-4 sm:mx-6">
          <div className="flex items-center justify-between pt-4">
            <Link href="/" className="inline-flex items-center gap-2 text-white" aria-label="LexReg Africa home">
              <LexRegLogoMark size={32} className="invert" />
              <span className="text-base font-semibold tracking-tight">LexReg</span>
            </Link>

            <nav className="hidden items-center gap-2 md:flex" aria-label="Primary">
              <div className="flex items-center gap-1 rounded-full bg-white/5 px-1 py-1 ring-1 ring-white/10 backdrop-blur">
                {NAV.map((link) => (
                  <a key={link.href} href={link.href} className="px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white">
                    {link.label}
                  </a>
                ))}
                <Link href="/login" className="px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white">Sign in</Link>
                <Link href="/signup" className="ml-1 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-white/90">
                  Get started
                  <Arrow d={['M7 7h10v10', 'M7 17 17 7']} />
                </Link>
              </div>
            </nav>

            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 backdrop-blur md:hidden"
              aria-expanded={menuOpen}
              aria-controls="hero-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-white/90" aria-hidden="true">
                {menuOpen ? <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></> : <><path d="M4 5h16" /><path d="M4 12h16" /><path d="M4 19h16" /></>}
              </svg>
            </button>
          </div>

          {menuOpen && (
            <nav id="hero-menu" className="mt-3 flex flex-col rounded-3xl bg-black/50 p-2 ring-1 ring-white/15 backdrop-blur-xl md:hidden" aria-label="Primary">
              {NAV.map((link) => (
                <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-3 text-base font-medium text-white/90 hover:bg-white/10">
                  {link.label}
                </a>
              ))}
              <div className="mt-1 grid grid-cols-2 gap-2 p-1">
                <Link href="/login" className="rounded-full px-4 py-3 text-center text-sm font-medium text-white ring-1 ring-white/20">Sign in</Link>
                <Link href="/signup" className="rounded-full bg-white px-4 py-3 text-center text-sm font-medium text-neutral-900">Get started</Link>
              </div>
            </nav>
          )}
        </div>
      </header>

      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 pb-16 pt-24 sm:pt-28 md:pt-32 lg:pt-40">
          <div className="mx-auto max-w-3xl text-center">
            <div className="hero-in-1 mb-6 inline-flex items-center gap-3 rounded-full bg-white/10 px-2.5 py-2 ring-1 ring-white/15 backdrop-blur">
              <span className="inline-flex items-center rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-neutral-900">New</span>
              <span className="text-sm font-medium text-white/90">LexReg AI, checked by a lawyer</span>
            </div>

            <h1 id="hero-title" className={`${serif.className} hero-in-2 text-4xl font-normal leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl`}>
              Your company&rsquo;s records, filings and lawyer.
              <br className="hidden sm:block" /> In one calm place.
            </h1>

            <p className="hero-in-3 mx-auto mt-6 max-w-2xl text-base text-white/80 sm:text-lg">
              Form or bring in your company, keep every register current, never miss a filing, and ask questions about your own records. Anything legal is signed by an advocate before it reaches you.
            </p>

            <div className="hero-in-4 mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-[#800020] px-5 py-3 text-sm font-medium text-white ring-1 ring-white/15 transition-colors hover:bg-[#9a1a35]">
                Get started free
                <Arrow d={['M5 12h14', 'm12 5 7 7-7 7']} />
              </Link>
              <a href="#ai" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-medium text-white/90 ring-1 ring-white/15 transition-colors hover:bg-white/15 hover:text-white">
                See LexReg AI
              </a>
            </div>
            <p className="hero-in-4 mt-4 text-xs text-white/65">Free to start. Pay only for the services you use.</p>
          </div>

          <div className="mx-auto mt-20 max-w-5xl">
            <p className="hero-in-1 text-center text-sm text-white/70">Built around Kenyan law and registries</p>
            <ul className="hero-in-2 mt-6 flex flex-wrap items-center justify-center gap-3">
              {BUILT_AROUND.map((item) => (
                <li key={item} className="rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-white/80 ring-1 ring-white/10 backdrop-blur">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
