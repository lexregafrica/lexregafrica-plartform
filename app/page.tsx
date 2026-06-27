import { HeroSection } from '@/components/landing/hero-section'
import { LogoCloud } from '@/components/ui/logo-cloud'
import { Highlighter } from '@/components/ui/highlighter'
import { HowItWorksSection } from '@/components/landing/how-it-works-section'
import { ServicesSection } from '@/components/landing/services-section'
import { GlobeSection } from '@/components/landing/globe-section'
import { InsightsSection } from '@/components/landing/insights-section'
import { FAQSection } from '@/components/landing/faq-section'
import { CTASection } from '@/components/landing/cta-section'
import { FooterSection } from '@/components/landing/footer-section'
import { CanvasFractalGrid } from '@/components/ui/canvas-fractal-grid'

export default function LandingPage() {
  return (
    <main>
      {/*
        Fractal grid — fixed behind the page, z below hero.
        Hero's Cloudscape is fully opaque so it covers this.
        All post-hero sections are transparent, letting the grid show through.
      */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <CanvasFractalGrid
          dotSize={2.5}
          dotSpacing={22}
          dotOpacity={0.65}
          gradientAnimationDuration={6}
          waveIntensity={18}
          waveRadius={320}
          dotColor="rgba(201, 162, 39, 0.20)"
          glowColor="rgba(201, 162, 39, 1)"
          enableNoise={true}
          noiseOpacity={0.04}
          enableMouseGlow={false}
          initialPerformance="high"
          gradients={[
            {
              stops: [
                { color: '#C9A227', position: 0 },
                { color: '#b8891e', position: 25 },
                { color: '#8a6415', position: 50 },
                { color: 'transparent', position: 75 },
              ],
              centerX: 25,
              centerY: 75,
            },
            {
              stops: [
                { color: '#1A1A2E', position: 0 },
                { color: '#232340', position: 25 },
                { color: '#2d2d52', position: 50 },
                { color: 'transparent', position: 75 },
              ],
              centerX: 75,
              centerY: 25,
            },
          ]}
        />
      </div>

      <HeroSection />

      {/* Trust bar — transparent background lets fractal show through */}
      <section className="relative px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <h2
            className="mb-6 text-center font-medium"
            style={{
              fontSize: 'clamp(15px, 2vw, 18px)',
              color: '#737373',
              fontFamily: 'SF Pro Text, var(--font-geist-sans), system-ui, sans-serif',
              letterSpacing: '-0.2px',
            }}
          >
            Designed around{' '}
            <Highlighter
              action="highlight"
              color="rgba(201,162,39,0.25)"
              strokeWidth={1}
              animationDuration={800}
              isView
            >
              <span style={{ color: '#1A1A2E', fontWeight: 600 }}>
                Kenya&apos;s regulatory framework
              </span>
            </Highlighter>
          </h2>
          <LogoCloud />
        </div>
      </section>

      <HowItWorksSection />
      <ServicesSection />
      <GlobeSection />
      <InsightsSection />
      <FAQSection />
      <CTASection />
      <FooterSection />
    </main>
  )
}
