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

export type ExtractedShareClass = {
  class_name: string | null // e.g. "Ordinary"
  number_of_shares: number | null
  nominal_value_each: number | null // KES
}

export type ExtractedFields = {
  document_kind:
    | 'national_id'
    | 'passport'
    | 'kra_pin_certificate'
    | 'proof_of_address'
    | 'business_registration'
    | 'certificate_of_incorporation'
    | 'cr12' // company search — directors & shareholders listing
    | 'cr1' // application for registration of a company
    | 'cr2' // memorandum of registration (company with share capital)
    | 'cr8' // notification of directors/secretary residential address
    | 'bof1' // beneficial ownership register filing
    | 'statement_of_nominal_capital'
    | 'other'
  full_name: string | null
  id_number: string | null
  kra_pin: string | null
  date_of_birth: string | null // YYYY-MM-DD
  phone: string | null
  occupation: string | null
  // Structured Kenyan address — county/district/locality are administrative
  // divisions distinct from the free-text street/building lines.
  address_line1: string | null // building/street/plot
  county: string | null
  district: string | null
  locality: string | null // town/estate/ward
  city: string | null
  postal_code: string | null
  business_name: string | null
  registration_number: string | null // company registration / incorporation number
  date_of_incorporation: string | null // YYYY-MM-DD
  // Share capital / structure — from CR2, Statement of Nominal Capital
  nominal_share_capital: number | null // KES, total
  share_classes: ExtractedShareClass[] | null
  // Beneficial ownership control indicators — from BOF1. Never used to
  // auto-decide BO status; always surfaced for user confirmation.
  bo_percent_shares_direct: number | null
  bo_percent_shares_indirect: number | null
  bo_percent_voting_rights: number | null
  bo_has_right_to_appoint_director: boolean | null
  bo_has_significant_influence: boolean | null
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
        'business_registration', 'certificate_of_incorporation', 'cr12',
        'cr1', 'cr2', 'cr8', 'bof1', 'statement_of_nominal_capital', 'other',
      ],
    },
    full_name: { type: 'STRING', nullable: true },
    id_number: { type: 'STRING', nullable: true },
    kra_pin: { type: 'STRING', nullable: true },
    date_of_birth: { type: 'STRING', nullable: true },
    phone: { type: 'STRING', nullable: true },
    occupation: { type: 'STRING', nullable: true },
    address_line1: { type: 'STRING', nullable: true },
    county: { type: 'STRING', nullable: true },
    district: { type: 'STRING', nullable: true },
    locality: { type: 'STRING', nullable: true },
    city: { type: 'STRING', nullable: true },
    postal_code: { type: 'STRING', nullable: true },
    business_name: { type: 'STRING', nullable: true },
    registration_number: { type: 'STRING', nullable: true },
    date_of_incorporation: { type: 'STRING', nullable: true },
    nominal_share_capital: { type: 'NUMBER', nullable: true },
    share_classes: {
      type: 'ARRAY',
      nullable: true,
      items: {
        type: 'OBJECT',
        properties: {
          class_name: { type: 'STRING', nullable: true },
          number_of_shares: { type: 'NUMBER', nullable: true },
          nominal_value_each: { type: 'NUMBER', nullable: true },
        },
      },
    },
    bo_percent_shares_direct: { type: 'NUMBER', nullable: true },
    bo_percent_shares_indirect: { type: 'NUMBER', nullable: true },
    bo_percent_voting_rights: { type: 'NUMBER', nullable: true },
    bo_has_right_to_appoint_director: { type: 'BOOLEAN', nullable: true },
    bo_has_significant_influence: { type: 'BOOLEAN', nullable: true },
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
CR12 (company search listing directors and shareholders), CR1 (application for
registration of a company), CR2 (memorandum of registration for a company with
share capital), CR8 (notification of director/secretary residential address),
BOF1 (beneficial ownership register filing), Statement of Nominal Capital, or
another business registration document.

Extract exactly these fields. Use null when a field is not present in the document.
- document_kind: classify the document
- full_name: the person's full legal name as printed (person documents only)
- id_number: national ID number (7-8 digits) or passport number (person documents only)
- kra_pin: KRA PIN in format A123456789B (letter, 9 digits, letter) — for a KRA PIN
  certificate this may belong to a company rather than a person
- date_of_birth: YYYY-MM-DD (person documents only)
- phone: telephone/mobile number as printed, if shown
- occupation: the person's stated occupation, if shown (CR8, CR12, BOF1)
- address_line1: building/street/plot line only, not the administrative divisions below
- county: Kenyan county
- district: district, if shown separately from county
- locality: town/estate/ward/locality, if shown separately from city
- city: city/town line as printed on the document
- postal_code: postal code / P.O. Box
- business_name: the company's registered name (company documents only)
- registration_number: company registration / incorporation number, e.g. PVT-XXXXXXX
  or C.XXXXX (company documents only)
- date_of_incorporation: YYYY-MM-DD (certificate of incorporation only)
- nominal_share_capital: total nominal share capital in KES (CR2, Statement of
  Nominal Capital)
- share_classes: every share class listed (CR2, Statement of Nominal Capital) —
  class name (e.g. "Ordinary"), number of shares, nominal value per share in KES
- bo_percent_shares_direct, bo_percent_shares_indirect, bo_percent_voting_rights:
  percentages as stated on a BOF1 filing — extract only if explicitly printed,
  never infer or calculate
- bo_has_right_to_appoint_director, bo_has_significant_influence: booleans as
  explicitly stated on a BOF1 filing — extract only if explicitly printed
- people: for CR12 or similar documents, every director and shareholder listed —
  full name, ID number if shown, KRA PIN if shown, role (director / shareholder /
  both), and number of shares held if shown
- confidence: 0-100, your certainty that the extracted values are correct

Do not guess values you cannot read. A wrong extraction is worse than null. These
BO-related fields are extraction aids only — a human always confirms beneficial
ownership conclusions; never treat them as authoritative.`

export async function extractFromDocument(
  bytes: Uint8Array,
  mimeType: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { ok: false, reason: 'no_api_key' }

  // Retry on transient failures — up to 3 attempts total with growing
  // backoff. Gemini's 503 ("model currently experiencing high demand")
  // fires in real bursts that can outlast a single 2.5s retry, and a
  // 429 from bursty multi-document uploads resets on its own per-minute
  // window — both are worth pushing through rather than giving up early.
  const BACKOFF_MS = [2_500, 8_000]
  let res = await callGemini(apiKey, bytes, mimeType)
  for (const delay of BACKOFF_MS) {
    if (res.status !== 503 && res.status !== 429) break
    await new Promise((r) => setTimeout(r, delay))
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
