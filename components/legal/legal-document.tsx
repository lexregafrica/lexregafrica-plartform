import Link from 'next/link'
import { IconArrowLeft } from '@tabler/icons-react'
import { NotchNavbar } from '@/components/ui/notch-navbar'
import type { LegalBlock, LegalDocumentData } from '@/lib/legal/types'

const NAVY = '#1A1A2E'

function Block({ block }: { block: LegalBlock }) {
  if (block.type === 'paragraph') {
    return (
      <p
        className="mb-4 leading-[1.75]"
        style={{ fontFamily: 'SF Pro Text, system-ui, sans-serif', fontSize: '16px', color: '#374151' }}
      >
        {block.text}
      </p>
    )
  }

  if (block.type === 'bullets') {
    const Tag = block.ordered ? 'ol' : 'ul'
    return (
      <Tag
        className="mb-4 space-y-2 pl-5"
        style={{ listStyleType: block.ordered ? 'decimal' : 'disc', color: '#374151' }}
      >
        {block.items.map((item, i) => (
          <li key={i} style={{ fontFamily: 'SF Pro Text, system-ui, sans-serif', fontSize: '16px', lineHeight: 1.7 }}>
            {item}
          </li>
        ))}
      </Tag>
    )
  }

  // table
  return (
    <div className="mb-5 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[480px] border-collapse text-left" style={{ fontFamily: 'SF Pro Text, system-ui, sans-serif' }}>
        <thead>
          <tr>
            {block.headers.map((h) => (
              <th
                key={h}
                className="border-b py-2 pr-4 text-[12px] font-semibold uppercase tracking-[0.06em]"
                style={{ color: NAVY, borderColor: 'rgba(26,26,46,0.12)' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="border-b py-3 pr-4 align-top text-[14.5px] leading-relaxed"
                  style={{ color: '#4b5563', borderColor: 'rgba(0,0,0,0.06)' }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function LegalDocument({ data, backHref }: { data: LegalDocumentData; backHref: string }) {
  return (
    <div className="relative min-h-screen" style={{ background: '#fafafa' }}>
      <NotchNavbar />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-32">
        <Link
          href={backHref}
          className="mb-10 inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: '#737373', fontFamily: 'SF Pro Text, system-ui, sans-serif' }}
        >
          <IconArrowLeft size={15} stroke={1.5} />
          Back to home
        </Link>

        <header className="mb-12">
          <h1
            className="mb-3 leading-tight"
            style={{
              fontFamily: 'SF Pro Display, system-ui, sans-serif',
              fontSize: 'clamp(28px, 4.5vw, 44px)',
              fontWeight: 750,
              color: NAVY,
              letterSpacing: '-0.035em',
              lineHeight: 1.12,
            }}
          >
            {data.title}
          </h1>

          <p
            className="mb-6 leading-relaxed"
            style={{ fontFamily: 'SF Pro Text, system-ui, sans-serif', fontSize: '17px', color: '#6b7280' }}
          >
            {data.subtitle}
          </p>

          <p className="text-[13px]" style={{ fontFamily: 'SF Pro Text, system-ui, sans-serif', color: '#9ca3af' }}>
            Last updated: {data.date}
          </p>

          <div className="mt-8 h-px w-full" style={{ background: 'linear-gradient(to right, rgba(201,162,39,0.3), transparent)' }} />
        </header>

        <div>
          {data.sections.map((section) => (
            <section key={section.number} className="mb-12">
              <h2
                className="mb-4"
                style={{
                  fontFamily: 'SF Pro Display, system-ui, sans-serif',
                  fontSize: 'clamp(20px, 2.5vw, 24px)',
                  fontWeight: 700,
                  color: NAVY,
                  letterSpacing: '-0.02em',
                }}
              >
                {section.number}. {section.heading}
              </h2>

              {section.blocks?.map((block, i) => <Block key={i} block={block} />)}

              {section.subsections?.map((sub, i) => (
                <div key={i} className="mb-6">
                  {sub.heading && (
                    <h3
                      className="mb-2 mt-6"
                      style={{
                        fontFamily: 'SF Pro Display, system-ui, sans-serif',
                        fontSize: '17px',
                        fontWeight: 650,
                        color: NAVY,
                      }}
                    >
                      {sub.heading}
                    </h3>
                  )}
                  {sub.blocks.map((block, j) => <Block key={j} block={block} />)}
                </div>
              ))}
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
