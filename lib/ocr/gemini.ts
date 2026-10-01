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
  // 'subscriber' = founding subscriber on a CR2 memorandum; 'secretary' =
  // company secretary on a CR12 / secretary form
  role: 'director' | 'shareholder' | 'both' | 'secretary' | 'subscriber' | 'proprietor' | 'partner' | 'manager' | 'member' | 'unknown'
  shares_held: number | null
  // Every other particular the document prints for this person — CR12s,
  // CR8s, BOF1s and LLP/partnership records carry these, and the person
  // screens are pre-filled from them (Charles, 2026-09-30: "my only work
  // is to make sure everything's correct").
  share_class?: string | null
  nationality?: string | null
  date_of_birth?: string | null // YYYY-MM-DD
  occupation?: string | null
  phone?: string | null
  email?: string | null
  address_line1?: string | null // building / street
  city?: string | null
  county?: string | null
  postal_address?: string | null // P.O. Box line
  postal_code?: string | null
  is_corporate?: boolean | null // the holder is a company / body corporate
  corporate_registration_number?: string | null
  appointment_date?: string | null // YYYY-MM-DD
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
    | 'cr13' // Official Search — business name (status report)
    | 'bn2' // application to register a business name
    | 'llp1' // LLP registration application
    | 'cr3' // memorandum — company limited by guarantee
    | 'cr29' // company annual return
    | 'llp9' // LLP statement of change
    | 'other'
  full_name: string | null
  id_number: string | null
  kra_pin: string | null
  date_of_birth: string | null // YYYY-MM-DD
  phone: string | null
  email: string | null
  occupation: string | null
  // Structured Kenyan address — county/district/locality are administrative
  // divisions distinct from the free-text street/building lines.
  address_line1: string | null // building/street/plot
  county: string | null
  district: string | null
  locality: string | null // town/estate/ward
  city: string | null
  postal_code: string | null
  postal_address: string | null // full P.O. Box line, e.g. "P.O. Box 19118-00100, Nairobi"
  business_name: string | null
  nature_of_business: string | null // business-name documents: nature / description of business
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
  // Date the document speaks as at — search date, filing date or issue
  // date — so later records can be told apart from historical ones.
  document_date: string | null // YYYY-MM-DD
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
        'cr1', 'cr2', 'cr8', 'bof1', 'statement_of_nominal_capital', 'cr13', 'bn2', 'llp1', 'llp9', 'cr3', 'cr29', 'other',
      ],
    },
    full_name: { type: 'STRING', nullable: true },
    id_number: { type: 'STRING', nullable: true },
    kra_pin: { type: 'STRING', nullable: true },
    date_of_birth: { type: 'STRING', nullable: true },
    phone: { type: 'STRING', nullable: true },
    email: { type: 'STRING', nullable: true },
    occupation: { type: 'STRING', nullable: true },
    address_line1: { type: 'STRING', nullable: true },
    county: { type: 'STRING', nullable: true },
    district: { type: 'STRING', nullable: true },
    locality: { type: 'STRING', nullable: true },
    city: { type: 'STRING', nullable: true },
    postal_code: { type: 'STRING', nullable: true },
    postal_address: { type: 'STRING', nullable: true },
    business_name: { type: 'STRING', nullable: true },
    nature_of_business: { type: 'STRING', nullable: true },
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
    document_date: { type: 'STRING', nullable: true },
    people: {
      type: 'ARRAY',
      nullable: true,
      items: {
        type: 'OBJECT',
        properties: {
          full_name: { type: 'STRING' },
          id_number: { type: 'STRING', nullable: true },
          kra_pin: { type: 'STRING', nullable: true },
          role: { type: 'STRING', enum: ['director', 'shareholder', 'both', 'secretary', 'subscriber', 'proprietor', 'partner', 'manager', 'member', 'unknown'] },
          shares_held: { type: 'NUMBER', nullable: true },
          share_class: { type: 'STRING', nullable: true },
          nationality: { type: 'STRING', nullable: true },
          date_of_birth: { type: 'STRING', nullable: true },
          occupation: { type: 'STRING', nullable: true },
          phone: { type: 'STRING', nullable: true },
          email: { type: 'STRING', nullable: true },
          address_line1: { type: 'STRING', nullable: true },
          city: { type: 'STRING', nullable: true },
          county: { type: 'STRING', nullable: true },
          postal_address: { type: 'STRING', nullable: true },
          postal_code: { type: 'STRING', nullable: true },
          is_corporate: { type: 'BOOLEAN', nullable: true },
          corporate_registration_number: { type: 'STRING', nullable: true },
          appointment_date: { type: 'STRING', nullable: true },
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
BOF1 (beneficial ownership register filing), Statement of Nominal Capital, a
business-name Certificate of Registration (business_registration), a business-name
Official Search (cr13), a BN2 business-name application (bn2), an LLP registration application (llp1),
an LLP statement of change (llp9), a CR3 memorandum for a company limited by guarantee
(cr3), a CR29 company annual return (cr29), or another business
registration document.

Extract exactly these fields. Use null when a field is not present in the document.
- document_kind: classify the document
- full_name: the person's full legal name as printed (person documents only)
- id_number: national ID number (7-10 digits) or passport number (person documents only)
- kra_pin: KRA PIN in format A123456789B (letter, 9 digits, letter) — for a KRA PIN
  certificate this may belong to a company rather than a person
- date_of_birth: YYYY-MM-DD (person documents only)
- phone: telephone/mobile number as printed, if shown (for a CR12 this is the
  registered office telephone)
- email: email address as printed, if shown (for a CR12 this is the registered
  office email; for a KRA PIN certificate, the taxpayer email)
- occupation: the person's stated occupation, if shown (CR8, CR12, BOF1)
- address_line1: building and street/road only (e.g. "Ngei Phase Two, Extension Way"),
  not the administrative divisions below. For company documents this is the
  REGISTERED OFFICE address (CR12 "Registered office", KRA PIN certificate
  "Registered address")
- county: Kenyan county
- district: district, if shown separately from county
- locality: town/estate/ward/locality, if shown separately from city
- city: city/town line as printed on the document
- postal_code: the 5-digit Kenyan postal code only (e.g. "00100"), if shown
- postal_address: the full P.O. Box line as printed (e.g. "P.O. Box 19118-00100, Nairobi"
  or "P.O BOX 19118 G.P.O NAIROBI"); for a KRA PIN certificate combine its separate
  P.O. Box and postal code fields into this one line
- business_name: the company's registered name (company documents only; on a
  KRA PIN certificate this is the "Taxpayer Name" when it is a company)
- nature_of_business: the nature / description of business as printed (business-name
  certificate, BN2, business-name search)
- registration_number: company registration / incorporation number, or business-name
  registration number (e.g. BN-XXXXXXX), e.g. PVT-XXXXXXX
  or C.XXXXX (company documents only)
- date_of_incorporation: YYYY-MM-DD (certificate of incorporation, the CR12 "Date of
  registration", or the registration date on a business-name certificate / search)
- nominal_share_capital: total nominal share capital in KES (CR2, Statement of
  Nominal Capital)
- share_classes: every share class listed (CR2, Statement of Nominal Capital) —
  class name (e.g. "Ordinary"), number of shares, nominal value per share in KES
- bo_percent_shares_direct, bo_percent_shares_indirect, bo_percent_voting_rights:
  percentages as stated on a BOF1 filing — extract only if explicitly printed,
  never infer or calculate
- bo_has_right_to_appoint_director, bo_has_significant_influence: booleans as
  explicitly stated on a BOF1 filing — extract only if explicitly printed
- document_date: YYYY-MM-DD the document speaks as at — the search/report date on an
  Official Search (CR12), the filing or signature date on a CR1/CR2/CR8/BOF1, or the
  issue date on a certificate
- people: for CR12 or similar documents, every director, shareholder and company
  secretary listed (role secretary); for a CR2 memorandum, every subscriber (role
  subscriber) with the shares they took; for a business-name certificate, BN2 or
  business-name search, every proprietor listed (role proprietor), or every partner
  where the business is a partnership (role partner); for an LLP (LLP 1, LLP 9, LLP
  search or annual return), every partner (role partner) and every manager (role
  manager); for a company limited by guarantee's CR3 every subscriber (role
  subscriber), and on its CR29 annual return or member register every member (role
  member) with their guarantee amount in shares_held (if the document states one
  amount for every member, put it on each member); someone who is both a director and
  a member gets role both —
  full name, ID or passport number, KRA PIN, role (director / shareholder / both),
  number of shares held and share class, and EVERY other particular printed for that
  person: nationality, date_of_birth (YYYY-MM-DD), occupation, phone, email, their
  address split into address_line1 (building/street), city, county, postal_address
  (P.O. Box line) and postal_code, appointment_date (YYYY-MM-DD), and — when the holder
  is a company or other body corporate — is_corporate true with its
  corporate_registration_number. On a CR8 the residential address of each director
  belongs in that director's address fields. Use null for anything not printed for
  that person; never copy one person's details onto another, and never use the
  company's own office address or contacts as a person's
- confidence: 0-100, your certainty that the extracted values are correct

Ignore contact details that belong to the issuing authority itself (e.g. the KRA call centre
phone numbers and email printed on every KRA certificate, or BRS's own address) — only
extract details of the person or company the document is about.

Do not guess values you cannot read. A wrong extraction is worse than null. These
BO-related fields are extraction aids only — a human always confirms beneficial
ownership conclusions; never treat them as authoritative.`

const GEMINI_TIMEOUT_MS = 20_000
const GROQ_TIMEOUT_MS = 20_000
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL ?? 'openai/gpt-oss-120b'
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL ?? 'qwen/qwen3.8-27b'

// Provider chain: Gemini (reads PDFs and images natively), falling back
// to Groq when Gemini fails, times out or is rate-limited — Gemini
// failures were being swallowed on the client, so a missed read silently
// left autofilled or empty fields in place (reported repeatedly by
// Charles, 2026-09-29). OCR_PRIMARY=groq flips the order for speed.
// `expectPeople`: the document is one that lists people (CR12, annual
// return, member register…). A provider occasionally returns the document
// without its people list; rather than leave the people screens empty,
// the other provider gets a go and the fuller reading wins.
export async function extractFromDocument(bytes: Uint8Array, mimeType: string, opts: { expectPeople?: boolean } = {}): Promise<ExtractionResult> {
  const providers = process.env.OCR_PRIMARY === 'groq' ? [extractWithGroq, extractWithGemini] : [extractWithGemini, extractWithGroq]
  let last: ExtractionResult = { ok: false, reason: 'no_api_key' }
  let firstOk: ExtractionResult | null = null
  for (const provider of providers) {
    const result = await provider(bytes, mimeType).catch((e): ExtractionResult => {
      console.error('ocr provider error', e)
      return { ok: false, reason: 'model_error' }
    })
    if (result.ok) {
      if (!opts.expectPeople || (result.fields.people?.length ?? 0) > 0) return result
      firstOk ??= result
      continue
    }
    if (result.reason !== 'no_api_key' || last.reason === 'no_api_key') last = result
  }
  return firstOk ?? last
}

async function extractWithGemini(bytes: Uint8Array, mimeType: string): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return { ok: false, reason: 'no_api_key' }

  // One retry on transient 503/429 — the Groq fallback now covers longer
  // outages, so there's no point making the user wait through several.
  let res = await callGemini(apiKey, bytes, mimeType)
  if (res.status === 503 || res.status === 429) {
    await new Promise((r) => setTimeout(r, 1_500))
    res = await callGemini(apiKey, bytes, mimeType)
  }
  if (res.status === 429) return { ok: false, reason: 'quota_exhausted' }
  if (!res.ok) {
    console.error('gemini error', res.status, await res.text().catch(() => ''))
    return { ok: false, reason: 'model_error' }
  }
  const data = await res.json()
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
  return parseFields(text)
}

async function callGemini(apiKey: string, bytes: Uint8Array, mimeType: string): Promise<Response> {
  try {
    return await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: Buffer.from(bytes).toString('base64') } }] }],
        generationConfig: { response_mime_type: 'application/json', response_schema: RESPONSE_SCHEMA, temperature: 0 },
      }),
    })
  } catch (e) {
    console.error('gemini request failed', e)
    return new Response(null, { status: 504 })
  }
}

const JSON_INSTRUCTIONS = `

Respond with ONLY a JSON object using exactly these keys (null where not present):
document_kind, document_date, full_name, id_number, kra_pin, date_of_birth, phone, email, occupation,
address_line1, county, district, locality, city, postal_code, postal_address,
business_name, nature_of_business, registration_number, date_of_incorporation, nominal_share_capital,
share_classes, bo_percent_shares_direct, bo_percent_shares_indirect,
bo_percent_voting_rights, bo_has_right_to_appoint_director,
bo_has_significant_influence, people, confidence.
Each people entry is an object with keys: full_name, id_number, kra_pin, role, shares_held,
share_class, nationality, date_of_birth, occupation, phone, email, address_line1, city,
county, postal_address, postal_code, is_corporate, corporate_registration_number,
appointment_date.
document_kind must be one of: ${(RESPONSE_SCHEMA.properties.document_kind.enum as string[]).join(', ')}.`

async function extractWithGroq(bytes: Uint8Array, mimeType: string): Promise<ExtractionResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return { ok: false, reason: 'no_api_key' }

  let messages: unknown[]
  let model: string
  if (mimeType === 'application/pdf') {
    // Groq's vision models take images, not PDFs — but KRA certificates,
    // CR12s and certificates of incorporation are text PDFs, so read the
    // text layer and use the faster text model.
    const { extractText, getDocumentProxy } = await import('unpdf')
    const pdf = await getDocumentProxy(new Uint8Array(bytes))
    const { text } = await extractText(pdf, { mergePages: true })
    if (text.replace(/\s+/g, '').length < 40) return { ok: false, reason: 'unreadable' } // scanned PDF, no text layer
    model = GROQ_TEXT_MODEL
    messages = [
      { role: 'system', content: PROMPT + JSON_INSTRUCTIONS },
      { role: 'user', content: `Document text:\n\n${text.slice(0, 20_000)}` },
    ]
  } else if (mimeType.startsWith('image/')) {
    model = GROQ_VISION_MODEL
    messages = [{
      role: 'user',
      content: [
        { type: 'text', text: PROMPT + JSON_INSTRUCTIONS },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}` } },
      ],
    }]
  } else {
    return { ok: false, reason: 'unreadable' }
  }

  let res: Response
  try {
    res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
      body: JSON.stringify({ model, messages, temperature: 0, response_format: { type: 'json_object' } }),
    })
  } catch (e) {
    console.error('groq request failed', e)
    return { ok: false, reason: 'model_error' }
  }
  if (res.status === 429) return { ok: false, reason: 'quota_exhausted' }
  if (!res.ok) {
    console.error('groq error', res.status, await res.text().catch(() => ''))
    return { ok: false, reason: 'model_error' }
  }
  const data = await res.json()
  return parseFields(data?.choices?.[0]?.message?.content)
}

// Text models sometimes return free-text roles ("director, member",
// "Director/Shareholder"); map them onto the schema's roles.
const ROLES = ['director', 'shareholder', 'both', 'secretary', 'subscriber', 'proprietor', 'partner', 'manager', 'member', 'unknown'] as const
function normaliseRole(role: unknown): ExtractedPerson['role'] {
  const r = String(role ?? '').toLowerCase()
  if ((ROLES as readonly string[]).includes(r)) return r as ExtractedPerson['role']
  const has = (w: string) => r.includes(w)
  if (has('director') && (has('shareholder') || has('member'))) return 'both'
  if (has('secretary')) return 'secretary'
  if (has('manager')) return 'manager'
  if (has('partner')) return 'partner'
  if (has('proprietor') || has('owner')) return 'proprietor'
  if (has('subscriber')) return 'subscriber'
  if (has('director')) return 'director'
  if (has('shareholder')) return 'shareholder'
  if (has('member') || has('guarantor')) return 'member'
  return 'unknown'
}

function parseFields(text: string | undefined): ExtractionResult {
  if (!text) return { ok: false, reason: 'model_error' }
  try {
    const raw = JSON.parse(text) as Partial<ExtractedFields>
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
    const fields = {
      ...raw,
      full_name: str(raw.full_name),
      id_number: str(raw.id_number),
      kra_pin: str(raw.kra_pin)?.replace(/\s+/g, '').toUpperCase() ?? null,
      registration_number: str(raw.registration_number)?.toUpperCase() ?? null,
      people: Array.isArray(raw.people)
        ? raw.people.map((pp) => ({
            ...pp,
            role: normaliseRole(pp.role),
            kra_pin: str(pp.kra_pin)?.replace(/\s+/g, '').toUpperCase() ?? null,
            id_number: str(pp.id_number),
            email: str(pp.email),
            phone: str(pp.phone),
          }))
        : raw.people ?? null,
      confidence: typeof raw.confidence === 'number' ? raw.confidence : 0,
    } as ExtractedFields
    if (!fields.document_kind) fields.document_kind = 'other'
    return { ok: true, fields }
  } catch {
    return { ok: false, reason: 'unreadable' }
  }
}
