import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PortableText } from '@portabletext/react'
import { IconArrowLeft, IconClock, IconCalendar } from '@tabler/icons-react'
import { getInsightBySlug, getAllInsightSlugs, PLACEHOLDER_INSIGHTS } from '@/lib/sanity/queries'
import { NotchNavbar } from '@/components/ui/notch-navbar'
import { CanvasFractalGrid } from '@/components/ui/canvas-fractal-grid'

const GOLD = '#C9A227'
const NAVY = '#1A1A2E'

const CATEGORY_COLORS: Record<string, string> = {
  Registration: GOLD,
  Governance: '#2563eb',
  'Data & Privacy': '#7c3aed',
  Compliance: '#16a34a',
  Legal: '#dc2626',
  Tax: '#ea580c',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const portableTextComponents = {
  block: {
    normal: ({ children }: { children?: React.ReactNode }) => (
      <p
        className="mb-5 leading-[1.75]"
        style={{
          fontFamily: 'SF Pro Text, system-ui, sans-serif',
          fontSize: '17px',
          color: '#374151',
        }}
      >
        {children}
      </p>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2
        className="mb-4 mt-10"
        style={{
          fontFamily: 'SF Pro Display, system-ui, sans-serif',
          fontSize: 'clamp(20px, 2.5vw, 26px)',
          fontWeight: 700,
          color: NAVY,
          letterSpacing: '-0.025em',
          lineHeight: 1.25,
        }}
      >
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3
        className="mb-3 mt-8"
        style={{
          fontFamily: 'SF Pro Display, system-ui, sans-serif',
          fontSize: '19px',
          fontWeight: 650,
          color: NAVY,
          letterSpacing: '-0.018em',
        }}
      >
        {children}
      </h3>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote
        className="my-6 border-l-4 pl-5 italic"
        style={{
          borderColor: GOLD,
          color: '#6b7280',
          fontFamily: 'SF Pro Text, system-ui, sans-serif',
          fontSize: '17px',
        }}
      >
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }: { children?: React.ReactNode }) => (
      <ul className="mb-5 space-y-2 pl-5" style={{ listStyleType: 'disc', color: '#374151' }}>
        {children}
      </ul>
    ),
    number: ({ children }: { children?: React.ReactNode }) => (
      <ol className="mb-5 space-y-2 pl-5" style={{ listStyleType: 'decimal', color: '#374151' }}>
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }: { children?: React.ReactNode }) => (
      <li
        style={{ fontFamily: 'SF Pro Text, system-ui, sans-serif', fontSize: '17px', lineHeight: 1.7 }}
      >
        {children}
      </li>
    ),
    number: ({ children }: { children?: React.ReactNode }) => (
      <li
        style={{ fontFamily: 'SF Pro Text, system-ui, sans-serif', fontSize: '17px', lineHeight: 1.7 }}
      >
        {children}
      </li>
    ),
  },
  marks: {
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong style={{ fontWeight: 650, color: NAVY }}>{children}</strong>
    ),
    em: ({ children }: { children?: React.ReactNode }) => (
      <em style={{ fontStyle: 'italic' }}>{children}</em>
    ),
    link: ({ children, value }: { children?: React.ReactNode; value?: { href: string } }) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: GOLD, textDecoration: 'underline', textDecorationColor: `${GOLD}60` }}
      >
        {children}
      </a>
    ),
  },
}

export async function generateStaticParams() {
  try {
    const slugs = await getAllInsightSlugs()
    return slugs.map((s) => ({ slug: s }))
  } catch {
    return PLACEHOLDER_INSIGHTS.map((i) => ({ slug: i.slug.current }))
  }
}

export default async function InsightPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let insight = null
  try {
    insight = await getInsightBySlug(slug)
  } catch {
    // Sanity unreachable — fall through to placeholder check
  }

  // Fall back to placeholder data so the page works before Sanity has content
  if (!insight) {
    const placeholder = PLACEHOLDER_INSIGHTS.find((i) => i.slug.current === slug)
    if (!placeholder) notFound()
    insight = placeholder
  }

  const categoryColor = CATEGORY_COLORS[insight.category] ?? GOLD

  return (
    <div className="relative min-h-screen" style={{ background: '#fafafa' }}>
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-40">
        <CanvasFractalGrid
          dotSize={2}
          dotSpacing={24}
          dotOpacity={0.5}
          dotColor="rgba(201, 162, 39, 0.18)"
          glowColor="rgba(201, 162, 39, 1)"
          enableNoise={true}
          noiseOpacity={0.03}
          enableMouseGlow={false}
          gradients={[
            {
              stops: [
                { color: '#C9A227', position: 0 },
                { color: 'transparent', position: 60 },
              ],
              centerX: 15,
              centerY: 85,
            },
          ]}
        />
      </div>

      <NotchNavbar />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-32">
        {/* Back link */}
        <Link
          href="/#insights"
          className="mb-10 inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: '#737373', fontFamily: 'SF Pro Text, system-ui, sans-serif' }}
        >
          <IconArrowLeft size={15} stroke={1.5} />
          Back to insights
        </Link>

        {/* Article header */}
        <header className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
              style={{ background: `${categoryColor}18`, color: categoryColor }}
            >
              {insight.category}
            </span>
            <span
              className="flex items-center gap-1 text-xs"
              style={{ color: '#9ca3af', fontFamily: 'SF Pro Text, system-ui, sans-serif' }}
            >
              <IconClock size={12} stroke={1.5} />
              {insight.readTime} min read
            </span>
            {insight.publishedAt && (
              <span
                className="flex items-center gap-1 text-xs"
                style={{ color: '#9ca3af', fontFamily: 'SF Pro Text, system-ui, sans-serif' }}
              >
                <IconCalendar size={12} stroke={1.5} />
                {formatDate(insight.publishedAt)}
              </span>
            )}
          </div>

          <h1
            className="mb-5 leading-tight"
            style={{
              fontFamily: 'SF Pro Display, system-ui, sans-serif',
              fontSize: 'clamp(28px, 4.5vw, 44px)',
              fontWeight: 750,
              color: NAVY,
              letterSpacing: '-0.035em',
              lineHeight: 1.12,
            }}
          >
            {insight.title}
          </h1>

          <p
            className="leading-relaxed"
            style={{
              fontFamily: 'SF Pro Text, system-ui, sans-serif',
              fontSize: '18px',
              color: '#6b7280',
              lineHeight: 1.65,
            }}
          >
            {insight.summary}
          </p>

          <div
            className="mt-8 h-px w-full"
            style={{ background: 'linear-gradient(to right, rgba(201,162,39,0.3), transparent)' }}
          />
        </header>

        {/* Article body */}
        <article>
          {insight.body ? (
            <PortableText value={insight.body as Parameters<typeof PortableText>[0]['value']} components={portableTextComponents} />
          ) : (
            <div
              className="rounded-2xl border p-8 text-center"
              style={{
                borderColor: 'rgba(201,162,39,0.15)',
                background: 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <p
                style={{
                  fontFamily: 'SF Pro Text, system-ui, sans-serif',
                  fontSize: '15px',
                  color: '#9ca3af',
                }}
              >
                Full article coming soon. Visit{' '}
                <Link
                  href="/studio"
                  style={{ color: GOLD }}
                  className="underline decoration-dotted"
                >
                  the CMS studio
                </Link>{' '}
                to add content to this insight.
              </p>
            </div>
          )}
        </article>

        {/* Footer CTA */}
        <div
          className="mt-16 flex flex-col items-center gap-4 rounded-2xl p-8 text-center"
          style={{
            background: 'rgba(26,26,46,0.88)',
            backdropFilter: 'blur(14px)',
            border: '1px solid rgba(201,162,39,0.15)',
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-[0.15em]"
            style={{ color: GOLD }}
          >
            Ready to get compliant?
          </p>
          <p
            style={{
              fontFamily: 'SF Pro Display, system-ui, sans-serif',
              fontSize: 'clamp(18px, 2.5vw, 24px)',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.025em',
            }}
          >
            LexReg handles this for you — start today.
          </p>
          <Link
            href="/#get-started"
            className="mt-1 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: GOLD, color: '#fff', fontFamily: 'SF Pro Text, system-ui, sans-serif' }}
          >
            Get started free
            <IconArrowLeft size={14} stroke={2} className="rotate-180" />
          </Link>
        </div>
      </main>
    </div>
  )
}
