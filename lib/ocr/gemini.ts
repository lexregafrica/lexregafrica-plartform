// Gemini Vision extraction — tier 2 of the OCR pipeline
// (tier 1, Google Document AI, slots in here once GCP credentials exist;
// tier 3 is the manual-entry fallback the wizard always offers).
//
// Server-side only: needs GEMINI_API_KEY, never expose to the client.

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

export type ExtractedPerson = {
  full_name: string
  id_number: string | null
  kra_pin: string | null
  role: 'director' | 'shareholder' | 'both' | 'unknown'
  shares_held: number | null
}

export type ExtractedFields = {
  document_kind:
    | 'national_id'
    | 'passport'
    | 'kra_pin_certificate'
    | 'proof_of_address'
    | 'business_registration'
    | 'certificate_of_incorporation'
    | 'cr12'
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
  registration_number: string | null // company registration / incorporation number
  date_of_incorporation: string | null // YYYY-MM-DD
  people: ExtractedPerson[] | null // directors/shareholders listed on CR12-type documents
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
      enum: [
        'national_id', 'passport', 'kra_pin_certificate', 'proof_of_address',
        'business_registration', 'certificate_of_incorporation', 'cr12', 'other',
      ],
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
    registration_number: { type: 'STRING', nullable: true },
    date_of_incorporation: { type: 'STRING', nullable: true },
    people: {
      type: 'ARRAY',
      nullable: true,
      items: {
        type: 'OBJECT',
        properties: {
          full_name: { type: 'STRING' },
          id_number: { type: 'STRING', nullable: true },
          kra_pin: { type: 'STRING', nullable: true },
          role: { type: 'STRING', enum: ['director', 'shareholder', 'both', 'unknown'] },
          shares_held: { type: 'NUMBER', nullable: true },
        },
        required: ['full_name', 'role'],
      },
    },
    confidence: { type: 'NUMBER' },
  },
  required: ['document_kind', 'confidence'],
}

const PROMPT = `You are extracting structured data from a Kenyan business-registration document.
The image or PDF is one of: Kenyan national ID card, passport, KRA PIN certificate,
proof of address (utility bill / lease / title), certificate of incorporation,
CR12 (company registrar search listing directors and shareholders), or another
business registration document.

Extract exactly these fields. Use null when a field is not present in the document.
- document_kind: classify the document
- full_name: the person's full legal name as printed (person documents only)
- id_number: national ID number (7-8 digits) or passport number (person documents only)
- kra_pin: KRA PIN in format A123456789B (letter, 9 digits, letter) — for a KRA PIN
  certificate this may belong to a company rather than a person
- date_of_birth: YYYY-MM-DD (person documents only)
- address_line1, city, county, postal_code: from address documents or a company's
  registered office shown on company documents
- business_name: the company's registered name (company documents only)
- registration_number: company registration / incorporation number, e.g. PVT-XXXXXXX
  or C.XXXXX (company documents only)
- date_of_incorporation: YYYY-MM-DD (certificate of incorporation only)
- people: for CR12 or similar documents, every director and shareholder listed —
  full name, ID number if shown, KRA PIN if shown, role (director / shareholder /
  both), and number of shares held if shown
- confidence: 0-100, your certainty that the extracted values are correct

Do not guess values you cannot read. A wrong extraction is worse than null.`

export async function extractFromDocument(
  bytes: Uint8Array,
  mimeType: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { ok: false, reason: 'no_api_key' }

  // One retry on transient overload (503) — spikes usually clear in seconds
  let res = await callGemini(apiKey, bytes, mimeType)
  if (res.status === 503) {
    await new Promise((r) => setTimeout(r, 2500))
    res = await callGemini(apiKey, bytes, mimeType)
  }

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

function callGemini(apiKey: string, bytes: Uint8Array, mimeType: string): Promise<Response> {
  return fetch(`${GEMINI_URL}?key=${apiKey}`, {
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
}
