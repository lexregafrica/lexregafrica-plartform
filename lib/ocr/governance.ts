// Governing-instrument extraction — reads a partnership agreement (and,
// later, an LLP agreement, articles, a society constitution or a trust
// deed) into structured governance rules. Charles's existing-entity
// briefs: the instrument "should not be stored only as a PDF"; its
// operative rules become structured fields, the signed document stays the
// controlling source, and where it is silent LexReg says so rather than
// inventing a rule.
//
// Same provider chain as lib/ocr/gemini.ts: Gemini first, Groq fallback.
// Server-side only.

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const TIMEOUT_MS = 45_000
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL ?? 'openai/gpt-oss-120b'

export type GovernanceFieldSpec = { key: string; label: string; hint: string }

export type GovernanceRule = {
  // Short plain-English summary of what the instrument provides
  summary: string | null
  // Clause/section reference as printed, e.g. "Clause 7.2"
  clause: string | null
  // True when the instrument does not address this matter at all
  silent: boolean
}

export type GovernanceExtraction =
  | { ok: true; rules: Record<string, GovernanceRule>; partiesNamed: string[]; datedAs: string | null }
  | { ok: false; reason: 'no_api_key' | 'quota_exhausted' | 'model_error' | 'unreadable' }

function prompt(instrument: string, fields: GovernanceFieldSpec[]) {
  return `You are reading a ${instrument} governed by Kenyan law. For each matter below,
summarise in one or two plain-English sentences what the document actually provides,
and give the clause reference as printed. If the document does not address the
matter, set silent to true and summary to null. Do not infer rules from general law
or from what such documents usually say — only what this document states. A wrong
summary is worse than marking it silent.

Matters:
${fields.map((f) => `- ${f.key}: ${f.label} — ${f.hint}`).join('\n')}

Also list parties_named (every person or company named as a party/partner/member)
and dated_as (YYYY-MM-DD the document is dated, or null).`
}

function schema(fields: GovernanceFieldSpec[]) {
  const rule = {
    type: 'OBJECT',
    properties: { summary: { type: 'STRING', nullable: true }, clause: { type: 'STRING', nullable: true }, silent: { type: 'BOOLEAN' } },
    required: ['silent'],
  }
  return {
    type: 'OBJECT',
    properties: {
      rules: { type: 'OBJECT', properties: Object.fromEntries(fields.map((f) => [f.key, rule])), required: fields.map((f) => f.key) },
      parties_named: { type: 'ARRAY', items: { type: 'STRING' } },
      dated_as: { type: 'STRING', nullable: true },
    },
    required: ['rules'],
  }
}

function parse(text: string | undefined, fields: GovernanceFieldSpec[]): GovernanceExtraction {
  if (!text) return { ok: false, reason: 'model_error' }
  try {
    const raw = JSON.parse(text) as { rules?: Record<string, Partial<GovernanceRule>>; parties_named?: unknown; dated_as?: unknown }
    const rules: Record<string, GovernanceRule> = {}
    for (const f of fields) {
      const r = raw.rules?.[f.key]
      const summary = typeof r?.summary === 'string' && r.summary.trim() ? r.summary.trim() : null
      rules[f.key] = { summary, clause: typeof r?.clause === 'string' && r.clause.trim() ? r.clause.trim() : null, silent: !summary || !!r?.silent }
    }
    const partiesNamed = Array.isArray(raw.parties_named) ? raw.parties_named.filter((x): x is string => typeof x === 'string' && !!x.trim()) : []
    const datedAs = typeof raw.dated_as === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.dated_as) ? raw.dated_as : null
    return { ok: true, rules, partiesNamed, datedAs }
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
}

async function withGemini(bytes: Uint8Array, mimeType: string, instrument: string, fields: GovernanceFieldSpec[]): Promise<GovernanceExtraction> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { ok: false, reason: 'no_api_key' }
  let res: Response
  try {
    res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt(instrument, fields) }, { inline_data: { mime_type: mimeType, data: Buffer.from(bytes).toString('base64') } }] }],
        generationConfig: { response_mime_type: 'application/json', response_schema: schema(fields), temperature: 0 },
      }),
    })
  } catch (e) {
    console.error('gemini governance request failed', e)
    return { ok: false, reason: 'model_error' }
  }
  if (res.status === 429) return { ok: false, reason: 'quota_exhausted' }
  if (!res.ok) {
    console.error('gemini governance error', res.status, await res.text().catch(() => ''))
    return { ok: false, reason: 'model_error' }
  }
  const data = await res.json()
  return parse(data?.candidates?.[0]?.content?.parts?.[0]?.text, fields)
}

async function withGroq(bytes: Uint8Array, mimeType: string, instrument: string, fields: GovernanceFieldSpec[]): Promise<GovernanceExtraction> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return { ok: false, reason: 'no_api_key' }
  if (mimeType !== 'application/pdf') return { ok: false, reason: 'unreadable' }
  const { extractText, getDocumentProxy } = await import('unpdf')
  const pdf = await getDocumentProxy(new Uint8Array(bytes))
  const { text } = await extractText(pdf, { mergePages: true })
  if (text.replace(/\s+/g, '').length < 200) return { ok: false, reason: 'unreadable' }
  const shape = `Respond with ONLY JSON: {"rules": {${fields.map((f) => `"${f.key}": {"summary": string|null, "clause": string|null, "silent": boolean}`).join(', ')}}, "parties_named": string[], "dated_as": string|null}`
  let res: Response
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        model: GROQ_TEXT_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${prompt(instrument, fields)}\n\n${shape}` },
          { role: 'user', content: `Document text:\n\n${text.slice(0, 60_000)}` },
        ],
      }),
    })
  } catch (e) {
    console.error('groq governance request failed', e)
    return { ok: false, reason: 'model_error' }
  }
  if (res.status === 429) return { ok: false, reason: 'quota_exhausted' }
  if (!res.ok) {
    console.error('groq governance error', res.status, await res.text().catch(() => ''))
    return { ok: false, reason: 'model_error' }
  }
  const data = await res.json()
  return parse(data?.choices?.[0]?.message?.content, fields)
}

export async function extractGovernanceRules(bytes: Uint8Array, mimeType: string, instrument: string, fields: GovernanceFieldSpec[]): Promise<GovernanceExtraction> {
  const providers = process.env.OCR_PRIMARY === 'groq' ? [withGroq, withGemini] : [withGemini, withGroq]
  let last: GovernanceExtraction = { ok: false, reason: 'no_api_key' }
  for (const p of providers) {
    const r = await p(bytes, mimeType, instrument, fields).catch((e) => {
      console.error('governance extraction failed', e)
      return { ok: false, reason: 'model_error' } as GovernanceExtraction
    })
    if (r.ok) return r
    if (r.reason !== 'no_api_key' || last.reason === 'no_api_key') last = r
  }
  return last
}
