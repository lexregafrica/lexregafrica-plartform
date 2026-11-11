import { serif } from '@/components/landing/fonts'

// Security and privacy — two columns: a statement on the left, a numbered
// list of plain commitments on the right. No icon cards.

const POINTS = [
  { title: 'Built for the Data Protection Act 2019', body: 'Consent, purpose limits, and deleted records kept recoverable for 30 days before removal.' },
  { title: 'Locked to your organisation', body: 'Every record is fenced to your organisation at the database. A lawyer sees only the one entity they work on.' },
  { title: 'Every action logged', body: 'Who did what, and when, including every LexReg AI answer.' },
  { title: 'Stored in the EU', body: 'Data lives in Frankfurt. AI requests go out with data retention switched off.' },
  { title: 'Signed by an advocate', body: 'Nothing legal reaches you unchecked. Audit reports are reviewed and signed by a lawyer.' },
  { title: 'Honest about BRS', body: 'BRS has no public API. We prepare everything, you file on eCitizen, and we never claim a filing that isn’t on record.' },
]

export function Trust() {
  return (
    <section id="trust" aria-labelledby="trust-title" className="bg-[#f7f5f2]">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20 lg:px-8 lg:py-24 xl:px-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="m-0 text-sm font-medium text-[#800020]">Security and privacy</p>
          <h2 id="trust-title" className={`${serif.className} m-0 mt-4 text-5xl font-normal leading-[1.02] tracking-[-0.02em] text-neutral-950 lg:text-6xl`}>
            Kept the way a lawyer would keep them.
          </h2>
          <p className="m-0 mt-6 max-w-[40ch] text-[17px] leading-relaxed text-neutral-600">
            Your company&rsquo;s records are evidence. We treat them that way, from who can open them to where they are stored.
          </p>
        </div>

        <ol className="m-0 list-none border-t border-neutral-900 p-0">
          {POINTS.map((p, i) => (
            <li key={p.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 border-b border-neutral-300 py-6">
              <span className="pt-0.5 text-sm tabular-nums text-neutral-400">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="m-0 text-lg font-medium leading-snug text-neutral-950">{p.title}</h3>
                <p className="m-0 mt-1.5 max-w-[56ch] text-[15px] leading-relaxed text-neutral-600">{p.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
