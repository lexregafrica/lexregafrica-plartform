import Link from 'next/link'
import {
  IconCheck, IconShieldLock, IconFileCertificate, IconWorld,
} from '@tabler/icons-react'
import { LexRegLogoMark } from '@/components/ui/lexreg-logo'
import { LandingFaq } from '@/components/landing/landing-faq'
import { HeroBanner } from '@/components/landing/hero-banner'
import { AiCapabilities } from '@/components/landing/ai-capabilities'
import { ThreeWays } from '@/components/landing/three-ways'
import Image from 'next/image'

// Landing page — built from "Home v2" on the LexReg UI Revamp design canvas.
// Design system v2 (.lx), burgundy on white. No invented logos, stats or
// testimonials.

const ICON = { size: 22, stroke: 1.75 } as const

export function HomeV2() {
  return (
    <div className="lx" style={{ minHeight: '100dvh', background: 'var(--bg)' }}>

      <main>
        <HeroBanner />

        <section aria-label="Product preview" style={{ paddingTop: 56 }}>
          <figure className="rise" style={{ '--d': 5, margin: '0 0 24px' } as React.CSSProperties} >
            {/* Snapshot of the real dashboard with sample data (no client data). */}
            <div className="h2-live">
              <Image src="/landing/dashboard.jpg" alt="The LexReg dashboard with sample data: filings, open matters, filing activity and the LexReg AI panel." width={2880} height={1524} sizes="100vw" priority className="block h-auto w-full" />
            </div>
            <figcaption className="t-footnote t-3" style={{ textAlign: 'center', marginTop: 12 }}>The LexReg dashboard, shown with sample data.</figcaption>
          </figure>
        </section>

        <ThreeWays />

        <AiCapabilities />

        <section id="pricing" className="section container" aria-labelledby="price-title">
          <div className="section-head" style={{ textAlign: 'center', alignItems: 'center', marginInline: 'auto' }}>
            <p className="t-eyebrow">Pricing</p>
            <h2 id="price-title" className="t-hero t-balance" style={{ margin: 0 }}>Free to run. Pay for the work.</h2>
          </div>
          <div className="h2-grid3">
            {[
              // TODO(Charles): formation price — the mockup left this as a placeholder.
              { eyebrow: 'Formation', price: 'Ask for a quote', sub: 'plus government fees, paid on eCitizen', ticks: ['Every BRS form prepared for you', 'Certificate upload and activation'], cta: 'Start a company', primary: false },
              { eyebrow: 'Corporate services', price: 'Quoted per matter', sub: 'confirmed before any work starts', ticks: ['Minutes, notices and resolutions', 'Statutory filings and register updates'], cta: 'Request a quote', primary: false },
              { eyebrow: 'Legal audit', price: 'KES 25,000', sub: 'one-time, per entity', ticks: ['Statutory, tax, employment and data protection', 'Written report signed by an advocate'], cta: 'Book a legal audit', primary: true },
            ].map((p) => (
              <article key={p.eyebrow} className="card card-pad stack gap-3" style={p.primary ? { boxShadow: 'inset 0 0 0 1.5px var(--brand)' } : undefined}>
                <p className={`t-eyebrow ${p.primary ? 't-brand' : ''}`} style={{ margin: 0 }}>{p.eyebrow}</p>
                <p className="t-title2" style={{ margin: 0 }}>{p.price}</p>
                <p className="t-footnote t-3" style={{ margin: 0 }}>{p.sub}</p>
                <div className="divider" />
                {p.ticks.map((t) => <p key={t} className="h2-tick t-callout"><IconCheck size={16} stroke={2.25} aria-hidden="true" />{t}</p>)}
                <Link className={`btn btn-pill ${p.primary ? 'btn-primary' : 'btn-gray'}`} href="/signup" style={{ marginTop: 'auto' }}>{p.cta}</Link>
              </article>
            ))}
          </div>
        </section>

        <section id="trust" className="section container" aria-labelledby="trust-title">
          <div className="section-head" style={{ textAlign: 'center', alignItems: 'center', marginInline: 'auto' }}>
            <p className="t-eyebrow">Security and privacy</p>
            <h2 id="trust-title" className="t-hero t-balance" style={{ margin: 0 }}>Built for the Data Protection Act 2019</h2>
          </div>
          <div className="h2-grid3">
            {[
              { Icon: IconShieldLock, title: 'Only you see your business', body: 'Every record is locked to your organisation. A lawyer sees only the one entity they are working on.' },
              { Icon: IconFileCertificate, title: 'Every action recorded', body: 'Who did what, and when, including every AI answer, is kept in an audit log.' },
              { Icon: IconWorld, title: 'Honest about BRS', body: 'BRS has no public API. We prepare everything; you file on eCitizen. We never claim a filing that isn’t on record.' },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="card card-pad stack gap-2">
                <Icon {...ICON} className="t-brand" aria-hidden="true" />
                <h3 className="t-headline" style={{ margin: 0 }}>{title}</h3>
                <p className="t-callout t-2" style={{ margin: 0 }}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="section container" aria-labelledby="faq-title" style={{ maxWidth: 880 }}>
          <div className="section-head" style={{ textAlign: 'center', alignItems: 'center', marginInline: 'auto' }}>
            <p className="t-eyebrow">FAQ</p>
            <h2 id="faq-title" className="t-hero" style={{ margin: 0 }}>Questions, answered</h2>
          </div>
          <LandingFaq />
        </section>

        <section className="section container" aria-labelledby="cta-title">
          <div className="h2-cta">
            <h2 id="cta-title" className="t-hero t-balance" style={{ margin: 0, color: 'inherit' }}>Put your company in order this week</h2>
            <p className="t-pretty" style={{ margin: 0, maxWidth: 520, fontSize: 17, opacity: 0.85 }}>Bring in your existing company in minutes, or start a new one. Free to start.</p>
            <Link className="btn btn-onbrand btn-lg btn-pill" href="/signup">Get started free</Link>
          </div>
        </section>
      </main>

      <footer className="container">
        <div className="h2-foot">
          <div className="stack gap-3">
            <span className="row gap-2"><LexRegLogoMark size={26} /><span className="t-headline">LexReg Africa</span></span>
            <p className="t-callout t-2 t-pretty" style={{ margin: 0, maxWidth: 340 }}>Governance, compliance and legal readiness for Kenyan businesses.</p>
          </div>
          <nav className="stack gap-2" aria-label="Product"><p className="t-footnote t-3" style={{ margin: 0 }}>Product</p><a href="#paths">How it works</a><a href="#ai">LexReg AI</a><a href="#pricing">Pricing</a></nav>
          <nav className="stack gap-2" aria-label="Company"><p className="t-footnote t-3" style={{ margin: 0 }}>Company</p><a href="#faq">FAQ</a><a href="mailto:hello@lexreg.africa">Contact</a></nav>
          <nav className="stack gap-2" aria-label="Legal"><p className="t-footnote t-3" style={{ margin: 0 }}>Legal</p><Link href="/legal/terms">Terms</Link><Link href="/legal/privacy">Privacy</Link></nav>
        </div>
        <div className="divider" />
        <div className="row wrap between gap-3" style={{ padding: '20px 0 40px' }}>
          <p className="t-footnote t-3" style={{ margin: 0 }}>&copy; 2026 LexReg Africa. Nairobi, Kenya.</p>
          <p className="t-footnote t-3 t-pretty" style={{ margin: 0, maxWidth: 560 }}>LexReg prepares documents and tracks compliance. Legal advice comes only from an advocate engaged through a LexReg service.</p>
        </div>
      </footer>
    </div>
  )
}
