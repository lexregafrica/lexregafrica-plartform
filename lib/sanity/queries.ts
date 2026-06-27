import { client } from './client'

export interface Insight {
  _id: string
  title: string
  slug: { current: string }
  summary: string
  category: string
  featured: boolean
  readTime: number
  publishedAt: string
  coverImage?: { asset: { url: string }; alt?: string }
  body?: unknown[] // Portable Text blocks
}

export const PLACEHOLDER_INSIGHTS: Insight[] = [
  {
    _id: 'p1',
    title: "Kenya's New LLC Framework: What Changes for Your Business",
    slug: { current: 'kenya-llc-framework' },
    summary:
      'The Limited Liability Company Act amendments create new pathways for businesses and dramatically simplify the registration process for entrepreneurs across the country.',
    category: 'Registration',
    featured: true,
    readTime: 6,
    publishedAt: '2026-06-01T00:00:00Z',
  },
  {
    _id: 'p2',
    title: 'Corporate Governance Essentials for Kenyan SMEs',
    slug: { current: 'corporate-governance-essentials' },
    summary:
      "Board minutes, resolutions, and annual returns—the governance basics every director must master.",
    category: 'Governance',
    featured: false,
    readTime: 4,
    publishedAt: '2026-05-20T00:00:00Z',
  },
  {
    _id: 'p3',
    title: 'Data Protection Compliance Under the Kenya DPA 2019',
    slug: { current: 'data-protection-compliance-dpa-2019' },
    summary:
      "What personal data processors must do to stay compliant with the Office of the Data Protection Commissioner.",
    category: 'Data & Privacy',
    featured: false,
    readTime: 5,
    publishedAt: '2026-05-10T00:00:00Z',
  },
  {
    _id: 'p4',
    title: 'Annual Returns: Avoid the KSh 5,000 Late Penalty',
    slug: { current: 'annual-returns-filing-guide' },
    summary:
      'A practical guide to BRS annual return deadlines and the consequences of missing them.',
    category: 'Compliance',
    featured: false,
    readTime: 3,
    publishedAt: '2026-04-28T00:00:00Z',
  },
  {
    _id: 'p5',
    title: 'Structuring for Foreign Investment: KRA and CBK Requirements',
    slug: { current: 'structuring-for-foreign-investment' },
    summary:
      'Currency controls, investment approval, and tax residency rules every foreign-backed startup needs to know.',
    category: 'Legal',
    featured: false,
    readTime: 7,
    publishedAt: '2026-04-15T00:00:00Z',
  },
]

const INSIGHT_FIELDS = `
  _id,
  title,
  slug,
  summary,
  category,
  featured,
  readTime,
  publishedAt,
  coverImage { asset->{ url }, alt }
`

export async function getFeaturedInsights(): Promise<Insight[]> {
  return client.fetch(
    `*[_type == "insight" && !(_id in path("drafts.**"))] | order(featured desc, publishedAt desc)[0...5] { ${INSIGHT_FIELDS} }`,
    {},
    { next: { revalidate: 60 } },
  )
}

export async function getInsightBySlug(slug: string): Promise<Insight | null> {
  return client.fetch(
    `*[_type == "insight" && slug.current == $slug && !(_id in path("drafts.**"))][0] {
      ${INSIGHT_FIELDS},
      body
    }`,
    { slug },
    { next: { revalidate: 60 } },
  )
}

export async function getAllInsightSlugs(): Promise<string[]> {
  const results: { slug: { current: string } }[] = await client.fetch(
    `*[_type == "insight" && !(_id in path("drafts.**"))] { slug }`,
    {},
    { next: { revalidate: 3600 } },
  )
  return results.map((r) => r.slug.current)
}
