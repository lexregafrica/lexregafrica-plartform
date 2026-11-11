import { LandingFaq } from '@/components/landing/landing-faq'
import { HeroBanner } from '@/components/landing/hero-banner'
import { AiCapabilities } from '@/components/landing/ai-capabilities'
import { ThreeWays } from '@/components/landing/three-ways'
import { Pricing } from '@/components/landing/pricing'
import { Trust } from '@/components/landing/trust'
import { SiteFooter } from '@/components/landing/site-footer'
import Image from 'next/image'

// Landing page — built from "Home v2" on the LexReg UI Revamp design canvas.
// Design system v2 (.lx), burgundy on white. No invented logos, stats or
// testimonials.

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

        <Pricing />

        <Trust />

        <section id="faq" aria-labelledby="faq-title" className="mx-auto w-full max-w-7xl px-4 py-10 sm:py-16 lg:px-8 lg:py-20">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="inline-flex items-center rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-800">FAQ</span>
            <h2 id="faq-title" className="m-0 text-3xl font-medium leading-tight tracking-tight text-neutral-900 xl:text-4xl">Questions, answered</h2>
          </div>
          <LandingFaq />
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
