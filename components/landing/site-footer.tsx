import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LexRegLogoMark } from '@/components/ui/lexreg-logo'

// Closing CTA + footer — adapted from Spectrum UI "Sales CTA Footer" (split):
// CTA card on the left, link groups on the right, legal bar beneath.

const GROUPS = [
  { title: 'Product', links: [{ label: 'How it works', href: '#paths' }, { label: 'LexReg AI', href: '#ai' }, { label: 'Pricing', href: '#pricing' }] },
  { title: 'Company', links: [{ label: 'Security', href: '#trust' }, { label: 'FAQ', href: '#faq' }, { label: 'Contact', href: 'mailto:hello@lexreg.africa' }] },
  { title: 'Legal', links: [{ label: 'Terms', href: '/legal/terms' }, { label: 'Privacy', href: '/legal/privacy' }] },
]

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-black/[0.08] bg-white text-neutral-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 lg:px-8 xl:px-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div className="min-w-0 rounded-2xl border border-black/[0.08] bg-[#FAFAFA] p-6 sm:p-8">
            <h2 className="m-0 text-balance text-2xl font-semibold leading-tight tracking-tight">Put your company in order this week.</h2>
            <p className="m-0 mt-2 max-w-[46ch] text-pretty text-[15px] leading-relaxed text-neutral-600">
              Bring in your existing company in minutes, or start a new one. Free to start, and you only pay for work a lawyer does.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="group inline-flex h-11 items-center gap-2 rounded-full bg-[#800020] px-5 text-sm font-medium text-white transition-[transform,background-color] duration-150 hover:bg-[#9a1a35] active:scale-[0.96]">
                Get started free
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link href="/login" className="inline-flex h-11 items-center rounded-full px-4 text-sm font-medium text-neutral-700 hover:text-neutral-950">Sign in</Link>
            </div>
          </div>

          <nav aria-label="Footer" className="grid min-w-0 grid-cols-2 gap-8 self-center sm:grid-cols-3">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <p className="m-0 text-[13px] font-medium text-neutral-900">{g.title}</p>
                <ul className="m-0 mt-4 list-none space-y-2.5 p-0">
                  {g.links.map((l) => (
                    <li key={l.label}><a href={l.href} className="text-sm text-neutral-600 transition-colors hover:text-neutral-950">{l.label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-black/[0.07] pt-6 md:flex-row md:items-start md:justify-between">
          <span className="inline-flex items-center gap-2"><LexRegLogoMark size={22} /><span className="text-sm font-semibold">LexReg Africa</span><span className="text-sm text-neutral-500">&copy; 2026 · Nairobi, Kenya</span></span>
          <p className="m-0 max-w-[60ch] text-pretty text-xs leading-relaxed text-neutral-500">
            LexReg prepares documents and tracks compliance. Legal advice comes only from an advocate engaged through a LexReg service.
          </p>
        </div>
      </div>
    </footer>
  )
}
