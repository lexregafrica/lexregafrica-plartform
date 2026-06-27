import { getFeaturedInsights, PLACEHOLDER_INSIGHTS } from '@/lib/sanity/queries'
import { InsightsBentoGrid } from './insights-bento-grid'

export async function InsightsSection() {
  let insights = PLACEHOLDER_INSIGHTS
  try {
    const live = await getFeaturedInsights()
    if (live.length > 0) insights = live
  } catch {
    // Sanity unreachable — fall back to placeholder data
  }

  return <InsightsBentoGrid insights={insights} />
}
