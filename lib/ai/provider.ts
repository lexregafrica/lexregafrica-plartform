import 'server-only'
import { createGroq } from '@ai-sdk/groq'

// Groq via the Vercel AI SDK. Key is server-only (GROQ_API_KEY); turn on
// Zero Data Retention in the Groq console. No Gemini fallback for AI
// answers: its free tier may train on inputs.
export const AI_MODELS = {
  primary: 'openai/gpt-oss-120b',
  fallback: 'openai/gpt-oss-20b',
} as const

/** Kill switch: AI_ENABLED=false turns every agent off without a deploy. */
export function aiEnabled() {
  return process.env.AI_ENABLED !== 'false' && !!process.env.GROQ_API_KEY
}

/** Agent runs allowed per organisation per 24 hours (AI_DAILY_RUN_CAP). */
export const DAILY_RUN_CAP = Number(process.env.AI_DAILY_RUN_CAP ?? 50)

export const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })
