import Link from 'next/link'
import {
  IconFileUpload, IconBuilding, IconTarget, IconBook, IconGavel, IconWriting,
  IconCheck, IconShieldLock, IconFileCertificate, IconWorld,
} from '@tabler/icons-react'
import { LexRegLogoMark } from '@/components/ui/lexreg-logo'
import { LandingFaq } from '@/components/landing/landing-faq'
import { HeroBanner } from '@/components/landing/hero-banner'

// Landing page — built from "Home v2" on the LexReg UI Revamp design canvas.
// Design system v2 (.lx), burgundy on white. No invented logos, stats or
// testimonials.

const ICON = { size: 22, stroke: 1.75 } as const

export function HomeV2() {
  return (
    <div className="lx" style={{ minHeight: '100dvh', background: 'var(--bg)' }}>

      <main>
        <HeroBanner />

        <section className="container" aria-label="Product preview" style={{ paddingTop: 56 }}>
          <figure className="rise" style={{ '--d': 5, margin: '0 0 24px' } as React.CSSProperties} aria-label="The LexReg dashboard with the LexReg AI panel open (illustration)">
            <div className="h2-shot" aria-hidden="true">
              <div className="h2-side">
                <div className="row gap-2" style={{ padding: '4px 8px 12px' }}><LexRegLogoMark size={22} /><span className="t-subhead" style={{ fontWeight: 600 }}>LexReg</span></div>
                <div className="it on">Dashboard</div>
                <div className="it">Entities<span className="grow" /><span className="t-footnote t-3">3</span></div>
                <div className="it">Matters<span className="grow" /><span className="t-footnote t-3">4</span></div>
                <div className="it">Services</div>
                <div className="it">Settings</div>
                <p className="t-3" style={{ margin: '14px 10px 4px', textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 10.5 }}>Your entities</p>
                <div className="it"><span className="dot" style={{ background: '#800020' }} />Amani Logistics</div>
                <div className="it"><span className="dot" style={{ background: '#C9A227' }} />Kilele Partners</div>
                <div className="it"><span className="dot" style={{ background: '#1A1A2E' }} />Tumaini Society</div>
              </div>
              <div className="h2-main">
                <div className="row between gap-3"><p className="t-title3" style={{ margin: 0 }}>Overview</p><span className="pill">This week</span></div>
                <div className="h2-kpis">
                  <div className="h2-kpi"><span className="t-footnote t-3">Filings done</span><b>3</b></div>
                  <div className="h2-kpi"><span className="t-footnote t-3">Documents added</span><b>12</b></div>
                  <div className="h2-kpi"><span className="t-footnote t-3">Open matters</span><b>4</b></div>
                  <div className="h2-kpi"><span className="t-footnote t-3">Next deadline</span><b style={{ fontSize: 18 }}>15 Nov</b></div>
                </div>
                <p className="t-subhead" style={{ margin: '6px 0 0', fontWeight: 600 }}>Needs attention</p>
                <div>
                  <div className="h2-row"><span className="pill pill-warn">Due in 4d</span><span className="grow truncate">Annual return 2026 — Amani Logistics Limited</span><span className="t-footnote t-3">Details</span></div>
                  <div className="h2-row"><span className="pill pill-brand">With lawyer</span><span className="grow truncate">Legal audit — Amani Logistics Limited</span><span className="t-footnote t-3">Details</span></div>
                  <div className="h2-row"><span className="pill">Open</span><span className="grow truncate">Beneficial ownership — BOF-1 lodgement</span><span className="t-footnote t-3">Details</span></div>
                </div>
              </div>
              <div className="h2-ai">
                <p className="t-footnote t-3" style={{ margin: 0 }}>Matter · Annual return 2026</p>
                <div className="h2-bubble h2-q">Who are our directors, and is anything missing before we file?</div>
                <div className="h2-bubble h2-a">
                  Your register lists <strong>Wanjiku Mwangi</strong> and <strong>Brian Otieno</strong>. Brian&rsquo;s KRA PIN differs between the CR12 and his KRA certificate, so confirm it before filing.
                  <span className="row wrap gap-1" style={{ marginTop: 8 }}><span className="h2-cite">Register</span><span className="h2-cite">CR12</span><span className="h2-cite">KRA certificate</span></span>
                </div>
                <span className="grow" />
                <div className="input" style={{ display: 'flex', alignItems: 'center', color: 'var(--label-4)' }}>Ask anything about this matter</div>
              </div>
            </div>
          </figure>
        </section>

        <section id="paths" className="section container" aria-labelledby="paths-title">
          <div className="section-head" style={{ textAlign: 'center', alignItems: 'center', marginInline: 'auto' }}>
            <p className="t-eyebrow">Three ways in</p>
            <h2 id="paths-title" className="t-hero t-balance" style={{ margin: 0 }}>Wherever your business is today</h2>
          </div>
          <div className="h2-grid3">
            {[
              { Icon: IconFileUpload, title: 'Already registered', body: 'Upload your CR12, certificate and IDs. We read them, you confirm anything we’re unsure of, and your registers and compliance calendar are ready.' },
              { Icon: IconBuilding, title: 'Starting a company', body: 'Answer a guided questionnaire. We prepare every form; you file on BRS eCitizen and upload the certificate. We take it from there.' },
              { Icon: IconTarget, title: 'Not registered yet', body: 'Take a 15-question readiness check. Get a score out of 100 and a plain list of what to fix before you formalise.' },
            ].map(({ Icon, title, body }) => (
              <article key={title} className="card card-pad stack gap-3">
                <span className="icon-tile icon-tile-lg" aria-hidden="true"><Icon {...ICON} /></span>
                <h3 className="t-title3" style={{ margin: 0 }}>{title}</h3>
                <p className="t-callout t-2" style={{ margin: 0 }}>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="ai" className="section container" aria-labelledby="ai-title">
          <div className="section-head" style={{ textAlign: 'center', alignItems: 'center', marginInline: 'auto' }}>
            <p className="t-eyebrow">LexReg AI</p>
            <h2 id="ai-title" className="t-hero t-balance" style={{ margin: 0 }}>AI drafts. Advocates sign.</h2>
            <p className="t-callout t-2 t-pretty" style={{ maxWidth: 640, margin: 0 }}>It reads only your own records, names its source for every fact, and says &ldquo;not on file&rdquo; instead of guessing. Legal work never reaches you without a lawyer&rsquo;s signature.</p>
          </div>
          <div className="h2-grid3">
            {[
              { Icon: IconBook, title: 'Ask your filings', body: '“When is our annual return due?” “Who holds more than 10%?” Answers from your registers and documents, with sources.' },
              { Icon: IconGavel, title: 'Legal audit', body: 'Every checklist item drafted from your records, then checked, edited and signed by an advocate. KES 25,000.' },
              { Icon: IconWriting, title: 'A better-prepared lawyer', body: 'Your assigned advocate starts with a briefing on gaps to raise, not a cold read of your files, so their time goes on judgement.' },
            ].map(({ Icon, title, body }) => (
              <article key={title} className="card card-pad stack gap-3">
                <Icon {...ICON} className="t-brand" aria-hidden="true" />
                <h3 className="t-title3" style={{ margin: 0 }}>{title}</h3>
                <p className="t-callout t-2" style={{ margin: 0 }}>{body}</p>
              </article>
            ))}
          </div>
          <ol className="h2-flow" aria-label="How a legal audit is produced">
            <li className="st"><span className="t-footnote t-3">1</span><strong>Your records</strong><span className="t-footnote t-3">Registers, documents, deadlines</span></li>
            <li className="st"><span className="t-footnote t-3">2</span><strong>AI draft</strong><span className="t-footnote t-3">Each finding with its sources</span></li>
            <li className="st"><span className="t-footnote t-3">3</span><strong>Advocate review</strong><span className="t-footnote t-3">Checked and edited line by line</span></li>
            <li className="st sign"><span className="t-footnote">4</span><strong>Signed report</strong><span className="t-footnote">Only now released to you</span></li>
          </ol>
        </section>

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
