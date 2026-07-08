// Gemini Vision extraction — tier 2 of the OCR pipeline
// (tier 1, Google Document AI, slots in here once GCP credentials exist;
// tier 3 is the manual-entry fallback the wizard always offers).
//
// Server-side only: needs GEMINI_API_KEY, never expose to the client.

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

export type ExtractedFields = {
  document_kind:
    | 'national_id'
    | 'passport'
    | 'kra_pin_certificate'
    | 'proof_of_address'
    | 'business_registration'
    | 'other'
  full_name: string | null
  id_number: string | null
  kra_pin: string | null
  date_of_birth: string | null // YYYY-MM-DD
  address_line1: string | null
  city: string | null
  county: string | null
  postal_code: string | null
  business_name: string | null
  confidence: number // 0-100, model's own certainty about the extraction
}

export type ExtractionResult =
  | { ok: true; fields: ExtractedFields }
  | { ok: false; reason: 'no_api_key' | 'quota_exhausted' | 'model_error' | 'unreadable' }

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    document_kind: {
      type: 'STRING',
      enum: ['national_id', 'passport', 'kra_pin_certificate', 'proof_of_address', 'business_registration', 'other'],
    },
    full_name: { type: 'STRING', nullable: true },
    id_number: { type: 'STRING', nullable: true },
    kra_pin: { type: 'STRING', nullable: true },
    date_of_birth: { type: 'STRING', nullable: true },
    address_line1: { type: 'STRING', nullable: true },
    city: { type: 'STRING', nullable: true },
    county: { type: 'STRING', nullable: true },
    postal_code: { type: 'STRING', nullable: true },
    business_name: { type: 'STRING', nullable: true },
    confidence: { type: 'NUMBER' },
  },
  required: ['document_kind', 'confidence'],
}

const PROMPT = `You are extracting structured data from a Kenyan business-registration document.
The image or PDF is one of: Kenyan national ID card, passport, KRA PIN certificate,
proof of address (utility bill / lease / title), or a business registration document.

Extract exactly these fields. Use null when a field is not present in the document.
- document_kind: classify the document
- full_name: the person's full legal name as printed
- id_number: national ID number (7-8 digits) or passport number
- kra_pin: KRA PIN in format A123456789B (letter, 9 digits, letter)
- date_of_birth: YYYY-MM-DD
- address_line1, city, county, postal_code: only from address documents
- business_name: only from business registration documents
- confidence: 0-100, your certainty that the extracted values are correct

Do not guess values you cannot read. A wrong extraction is worse than null.`

export async function extractFromDocument(
  bytes: Uint8Array,
  mimeType: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { ok: false, reason: 'no_api_key' }

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mimeType, data: Buffer.from(bytes).toString('base64') } },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        response_schema: RESPONSE_SCHEMA,
        temperature: 0,
      },
    }),
  })

  if (res.status === 429) return { ok: false, reason: 'quota_exhausted' }
  if (!res.ok) {
    console.error('gemini error', res.status, await res.text().catch(() => ''))
    return { ok: false, reason: 'model_error' }
  }

  const data = await res.json()
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return { ok: false, reason: 'model_error' }

  try {
    const fields = JSON.parse(text) as ExtractedFields
    if (typeof fields.confidence !== 'number') fields.confidence = 0
    return { ok: true, fields }
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
}
