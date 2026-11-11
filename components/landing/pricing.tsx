import Link from 'next/link'
import { serif } from '@/components/landing/fonts'

// Pricing — editorial price list: one row per service, hairline rules,
// serif names and figures. No subscriptions, so no tiers or toggles.

const SERVICES = [
  // TODO(Charles): formation price.
  { name: 'Formation', price: 'On quote', note: 'plus eCitizen fees', body: 'Start a new company. We prepare every BRS form, name option and share structure; you file on eCitizen and upload the certificate.', cta: 'Start a company' },
  { name: 'Legal audit', price: 'KES 25,000', note: 'one-time, per entity', body: 'Statutory, tax, employment and data protection, drafted from your records by LexReg AI, then checked and signed by an advocate.', cta: 'Book a legal audit', primary: true },
  { name: 'Corporate services', price: 'Per matter', note: 'quoted before work starts', body: 'Minutes, notices, resolutions, statutory filings and register updates, handled by a lawyer.', cta: 'Request a quote' },
]

export function Pricing() {
  return (
    <section id="pricing" aria-labelledby="price-title">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 lg:px-8 lg:py-24 xl:px-16">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-end">
          <h2 id="price-title" className={`${serif.className} m-0 text-5xl font-normal leading-[1.02] tracking-[-0.02em] text-neutral-950 lg:text-7xl`}>
            Free to run.<br />Pay for the work.
          </h2>
          <p className="m-0 max-w-[42ch] text-[17px] leading-relaxed text-neutral-600 md:justify-self-end">
            The dashboard, registers, reminders and LexReg AI cost nothing. You pay when a lawyer does work for you, and you see the price first.
          </p>
        </div>

        <ul className="m-0 mt-14 list-none border-t border-neutral-900 p-0">
          {SERVICES.map((s) => (
            <li key={s.name} className="grid gap-4 border-b border-neutral-200 py-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)_minmax(0,0.8fr)] md:gap-10">
              <h3 className={`${serif.className} m-0 text-3xl font-normal leading-tight text-neutral-950`}>{s.name}</h3>
              <p className="m-0 max-w-[52ch] text-[15px] leading-relaxed text-neutral-600">{s.body}</p>
              <div className="flex flex-col gap-1 md:items-end md:text-right">
                <p className={`${serif.className} m-0 text-3xl leading-none tabular-nums text-neutral-950`}>{s.price}</p>
                <p className="m-0 text-sm text-neutral-500">{s.note}</p>
                <Link
                  href="/signup"
                  className={`mt-4 inline-flex h-10 items-center self-start rounded-full px-5 text-sm font-medium transition-colors md:self-end ${s.primary ? 'bg-[#800020] text-white hover:bg-[#9a1a35]' : 'text-neutral-900 ring-1 ring-neutral-300 hover:bg-neutral-100'}`}
                >
                  {s.cta}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
