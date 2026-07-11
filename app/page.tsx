import { IosNavbar } from '@/components/landing/ios-navbar'
import { IosHero } from '@/components/landing/ios-hero'
import { IosServices } from '@/components/landing/ios-services'
import { IosHowItWorks } from '@/components/landing/ios-how-it-works'
import { GlobeSection } from '@/components/landing/globe-section'
import { IosFaq } from '@/components/landing/ios-faq'
import { IosCta } from '@/components/landing/ios-cta'
import { FooterSection } from '@/components/landing/footer-section'

// iOS-style landing: solid grouped-grey background, white cards,
// burgundy accents. No canvas backgrounds or scroll-jacking effects.
export default function LandingPage() {
  return (
    <main style={{ background: '#F2F2F7' }}>
      <IosNavbar />
      <IosHero />
      <IosServices />
      <IosHowItWorks />
      <GlobeSection />
      <IosFaq />
      <IosCta />
      <FooterSection />
    </main>
  )
}
