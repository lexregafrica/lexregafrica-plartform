// Information Document Package (IDP) / "Company Registration & Governance
// Summary" generator — revised per Charles's layout template (2026): a
// full client-review pack, not just a one-page snapshot. Not an official
// BRS form — it's the review document a client checks and signs off on
// before self-filing, requesting assisted filing, or handing to a lawyer.
//
// pdf-lib over reportlab here deliberately: this runs inside a Vercel
// serverless function at request time, where a Python runtime isn't
// available. reportlab stays the right tool for the locally-run
// marketing/audit report scripts (generate_brand.py, generate_audit.py).

import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib'

// Formal black/gray palette — this document sits alongside real BRS
// filings (CR1/CR2/CR8), so it reads as a plain reference document, not
// branded marketing collateral.
const BLACK = rgb(0.06, 0.06, 0.08)
const GRAY = rgb(0.4, 0.4, 0.42)
const RULE_GRAY = rgb(0.75, 0.75, 0.75)
const GOOD = rgb(0.1, 0.45, 0.2)
const WARN = rgb(0.7, 0.35, 0.05)
const PAGE_WIDTH = 595.28 // A4
const PAGE_HEIGHT = 841.89
const MARGIN = 56
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

export type IdpDirector = {
  fullName: string
  role: string
  nationality: string | null
  idNumber: string | null
  kraPin: string | null
  email: string | null
  phone: string | null
  address: string | null
  isAlsoShareholder: boolean
  isAlsoBeneficialOwner: boolean
}

export type IdpShareholder = {
  legalName: string
  type: 'Individual' | 'Company'
  nationalityOrJurisdiction: string | null
  idOrRegNumber: string | null
  kraPinOrTaxId: string | null
  shareClass: string
  sharesHeld: number
  sharePercentage: number | null
  isNominee: boolean
}

export type IdpCorporateParty = {
  registeredName: string
  jurisdiction: string | null
  regNumber: string | null
  kraPinOrTaxId: string | null
  registeredOfficeAddress: string | null
  email: string | null
  phone: string | null
  role: string
  repName: string | null
  repTitle: string | null
  repEmail: string | null
  repPhone: string | null
  authorityBasis: string | null
}

export type IdpBeneficialOwner = {
  fullName: string
  nationality: string | null
  idNumber: string | null
  kraPin: string | null
  address: string | null
  phone: string | null
  email: string | null
  natureOfControl: string
  sharePercentage: number | null
  dateBecameBo: string | null
}

export type IdpFormStatus = { label: string; generated: boolean; signed: boolean; uploaded: boolean }
export type IdpDocumentGroup = { label: string; items: Array<{ name: string; provided: boolean }> }

export type IdpInput = {
  // 1. Cover & matter summary
  organisationName: string
  generatedAt: Date
  matterReference: string
  servicePath: string
  onboardingType: string

  // 2. Company overview
  entityTypeLabel: string
  legalNameOptions: string[]
  natureOfBusiness: string | null
  registeredAddress: { line1: string | null; city: string | null; county: string | null; postcode: string | null } | null
  postalAddress: string | null
  companyEmail: string | null
  companyPhone: string | null

  // 3. Applicant & primary contact
  applicantName: string | null
  applicantRelationship: string | null
  applicantEmail: string | null
  applicantPhone: string | null

  // 4. Share capital summary
  totalShares: number | null
  authorisedCapital: number | null
  nominalValuePerShare: number | null
  useMultipleShareClasses: boolean
  shareClassCount: number
  votingRights: string | null

  // 5. Directors & officers
  directors: IdpDirector[]
  secretaryName: string | null

  // 6. Shareholders & cap table
  shareholders: IdpShareholder[]

  // 7. Corporate party annex
  corporateParties: IdpCorporateParty[]

  // 8. Beneficial ownership
  beneficialOwners: IdpBeneficialOwner[]
  noBeneficialOwnersDeclared: boolean

  // 9. Constitutional basis
  articlesType: 'standard' | 'custom' | null

  // 10. Forms & filing preview
  forms: IdpFormStatus[]

  // 11. Uploaded documents checklist
  documentGroups: IdpDocumentGroup[]

  // 12. Review exceptions
  exceptions: string[]

  // 13. Client confirmation
  declared: boolean
  signature: string | null
  declarationDate: string | null

  // Trust Formation Workflow spec, 2026-08 — when set, the summary uses
  // trust terminology throughout (Settlors/Trustees/Beneficiaries, no
  // share capital or beneficial-ownership sections) instead of the
  // company-registration framing the rest of this document defaults to.
  isTrust?: boolean
  trustProperty?: Array<{ description: string; category: string; approxValue: string | null; isVested: boolean }>
  protector?: { name: string; powers: string | null } | null
  hasTrustDeed?: boolean | null

  // Society Formation Workflow spec, 2026-08 — when set, the summary
  // uses membership-organisation terminology (Officers/Members/
  // Constitution), skipping share capital and beneficial ownership
  // entirely rather than relabelling them (a Society has neither).
  isSociety?: boolean
  societyGoverningBody?: { name: string; quorum: string | null } | null
  societyProperty?: Array<{ description: string; location: string }>
  hasConstitution?: boolean | null
}

export async function generateIdp(input: IdpInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.TimesRoman)
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold)
  const ctx = new PageBuilder(doc, font, bold)

  const isTrust = !!input.isTrust
  const isSociety = !!input.isSociety

  // ---------- 1. Cover & matter summary ----------
  ctx.title(isTrust ? 'TRUST FORMATION & GOVERNANCE SUMMARY' : isSociety ? 'SOCIETY REGISTRATION & GOVERNANCE SUMMARY' : 'COMPANY REGISTRATION & GOVERNANCE SUMMARY')
  ctx.subtitle(`Prepared for ${input.organisationName}  ·  ${formatDate(input.generatedAt)}`)
  ctx.rule(true)
  ctx.notice(
    isTrust
      ? 'This document summarises the information provided to LexReg Africa for the creation of a trust. It ' +
        'is not itself the Trust Deed, but is intended as the review pack from which the deed and any ' +
        'trustee-incorporation filing are confirmed.'
      : isSociety
      ? 'This document summarises the information provided to LexReg Africa for registration of a Society. It ' +
        'is not itself the Constitution or an official filing, but is intended as the review pack from which ' +
        'the Constitution and registration application are confirmed.'
      : 'This document summarises the information provided to LexReg Africa for a private company limited by ' +
        'shares. It is not itself an official BRS form, but it is intended to be used as the review pack from ' +
        'which statutory forms and filing information are confirmed.'
  )
  ctx.section('Matter Summary')
  ctx.field('Matter reference', input.matterReference)
  ctx.field('Onboarding type', input.onboardingType)
  ctx.field('Service path', input.servicePath)

  // ---------- 2. Company overview ----------
  ctx.section(isTrust ? 'Trust Overview' : isSociety ? 'Society Overview' : 'Company Overview')
  ctx.field(isTrust ? 'Trust type' : isSociety ? 'Entity type' : 'Company type', input.entityTypeLabel)
  const names = input.legalNameOptions.filter(Boolean)
  ctx.field(isTrust ? 'Proposed trust name' : isSociety ? 'Proposed society name' : 'Proposed company name', names[0] ?? '—')
  if (names.length > 1) ctx.field('Alternative names', names.slice(1).join('  •  '))
  if (!isTrust) ctx.field(isSociety ? 'Principal activities' : 'Nature of business', input.natureOfBusiness ?? '—')
  const addr = input.registeredAddress
  ctx.field(isTrust || isSociety ? 'Registered / administrative address' : 'Registered office', addr ? [addr.line1, addr.city, addr.county, addr.postcode].filter(Boolean).join(', ') || '—' : '—')
  ctx.field('Postal address', input.postalAddress ?? '—')
  ctx.field(isTrust || isSociety ? 'Contact email' : 'Company email', input.companyEmail ?? '—')
  ctx.field(isTrust || isSociety ? 'Contact phone' : 'Company phone', input.companyPhone ?? '—')

  // ---------- 3. Applicant & primary contact ----------
  ctx.section('Applicant & Primary Contact')
  ctx.field('Applicant name', input.applicantName ?? '—')
  ctx.field('Relationship to company', input.applicantRelationship ?? '—')
  ctx.field('Applicant email', input.applicantEmail ?? '—')
  ctx.field('Applicant phone', input.applicantPhone ?? '—')

  // ---------- 4. Share capital summary ----------
  if (!isTrust && !isSociety) {
    ctx.section('Share Capital Summary')
    ctx.field('Total number of shares', input.totalShares != null ? input.totalShares.toLocaleString() : '—')
    ctx.field('Authorised capital', input.authorisedCapital != null ? `KES ${input.authorisedCapital.toLocaleString()}` : '—')
    ctx.field('Nominal value per share', input.nominalValuePerShare != null ? `KES ${input.nominalValuePerShare.toLocaleString()}` : '—')
    ctx.field('Share structure', input.useMultipleShareClasses ? `Multiple classes (${input.shareClassCount})` : 'Single class (ordinary)')
    ctx.field('Voting rights', input.votingRights ?? '—')
  }

  // ---------- 5. Directors & officers / Trustees / Officers ----------
  if (input.directors.length > 0) {
    if (isTrust || isSociety) {
      ctx.section(isSociety ? 'Officers' : 'Trustees')
      ctx.table(
        ['Name', 'Role', 'Nationality', 'ID / Passport', 'KRA PIN'],
        [0.3, 0.14, 0.16, 0.2, 0.2],
        input.directors.map((d) => [d.fullName, d.role, d.nationality ?? '—', d.idNumber ?? '—', d.kraPin ?? '—'])
      )
    } else {
      ctx.section('Directors & Officers')
      ctx.table(
        ['Name', 'Role', 'Nationality', 'ID / Passport', 'KRA PIN', 'Also SH?', 'Also BO?'],
        [0.24, 0.12, 0.14, 0.16, 0.14, 0.1, 0.1],
        input.directors.map((d) => [
          d.fullName, d.role, d.nationality ?? '—', d.idNumber ?? '—', d.kraPin ?? '—',
          d.isAlsoShareholder ? 'Yes' : 'No', d.isAlsoBeneficialOwner ? 'Yes' : 'No',
        ])
      )
      if (input.secretaryName) ctx.field('Company secretary', input.secretaryName)
    }
  }

  // ---------- 6. Shareholders & cap table / Beneficiaries / Members ----------
  if (input.shareholders.length > 0) {
    if (isTrust || isSociety) {
      ctx.section(isSociety ? 'Founding Members' : 'Beneficiaries')
      ctx.table(
        [isSociety ? 'Name' : 'Name / class', 'ID / Passport (if applicable)'],
        [0.6, 0.4],
        input.shareholders.map((s) => [s.legalName, s.idOrRegNumber ?? '—'])
      )
    } else {
      ctx.section('Shareholders & Cap Table')
      ctx.table(
        ['Name', 'Type', 'ID / Reg. no.', 'Class', 'Shares', '%', 'Nominee?'],
        [0.26, 0.1, 0.18, 0.12, 0.12, 0.1, 0.12],
        input.shareholders.map((s) => [
          s.legalName, s.type, s.idOrRegNumber ?? '—', s.shareClass, s.sharesHeld.toLocaleString(),
          s.sharePercentage != null ? `${s.sharePercentage}%` : '—', s.isNominee ? 'Yes' : 'No',
        ])
      )
    }
  } else if (isTrust) {
    ctx.section('Beneficiaries')
    ctx.field('Charitable beneficiary class', 'See charitable objects below — no individual beneficiaries required.')
  } else if (isSociety) {
    ctx.section('Founding Members')
    ctx.field('Declaration', 'Not yet confirmed — outstanding before filing.')
  }

  // ---------- Governing committee & property (society only) ----------
  if (isSociety) {
    ctx.section('Governing Committee')
    ctx.field('Appointed', input.societyGoverningBody ? 'Yes' : 'No')
    if (input.societyGoverningBody) {
      ctx.field('Name', input.societyGoverningBody.name)
      ctx.field('Quorum', input.societyGoverningBody.quorum ?? '—')
    }
    if ((input.societyProperty ?? []).length > 0) {
      ctx.section('Property')
      ctx.table(
        ['Description', 'Location'],
        [0.5, 0.5],
        (input.societyProperty ?? []).map((p) => [p.description, p.location])
      )
    }
  }

  // ---------- 7. Corporate party annex ----------
  if (input.corporateParties.length > 0) {
    ctx.section('Corporate Shareholder / Director Annex')
    ctx.notice('Corporate participants are listed in full below rather than flattened into the person tables above.')
    for (const c of input.corporateParties) {
      ctx.subheading(c.registeredName)
      ctx.field('Role', c.role)
      ctx.field('Jurisdiction', c.jurisdiction ?? '—')
      ctx.field('Registration number', c.regNumber ?? '—')
      ctx.field('KRA PIN / foreign tax ID', c.kraPinOrTaxId ?? '—')
      ctx.field('Registered office', c.registeredOfficeAddress ?? '—')
      ctx.field('Company email / phone', [c.email, c.phone].filter(Boolean).join(' / ') || '—')
      ctx.field('Authorised representative', c.repName ?? '—')
      ctx.field('Representative title', c.repTitle ?? '—')
      ctx.field('Representative contact', [c.repEmail, c.repPhone].filter(Boolean).join(' / ') || '—')
      ctx.field('Authority basis', c.authorityBasis ?? '—')
      ctx.spacer(6)
    }
  }

  // ---------- 8. Beneficial ownership / Settlors ----------
  // Society has no beneficial-ownership concept at all (spec section
  // 40) — the section is omitted entirely rather than shown empty.
  if (isSociety) {
    // intentionally no section rendered
  } else if (isTrust) {
    ctx.section('Settlors')
    if (input.beneficialOwners.length > 0) {
      ctx.table(
        ['Name', 'Nationality', 'ID / Passport', 'Relationship to beneficiaries'],
        [0.28, 0.16, 0.2, 0.36],
        input.beneficialOwners.map((b) => [b.fullName, b.nationality ?? '—', b.idNumber ?? '—', b.natureOfControl])
      )
    } else {
      ctx.field('Declaration', 'Not yet confirmed — outstanding before filing.')
    }
  } else {
    ctx.section('Beneficial Ownership Summary')
    if (input.noBeneficialOwnersDeclared && input.beneficialOwners.length === 0) {
      ctx.field('Declaration', 'No individual currently holds 10%+ ownership/control — confirmed by applicant.')
    } else if (input.beneficialOwners.length > 0) {
      ctx.table(
        ['Name', 'Nationality', 'ID / Passport', 'Nature of control', '% / basis', 'Since'],
        [0.22, 0.14, 0.16, 0.24, 0.12, 0.12],
        input.beneficialOwners.map((b) => [
          b.fullName, b.nationality ?? '—', b.idNumber ?? '—', b.natureOfControl,
          b.sharePercentage != null ? `${b.sharePercentage}%` : '—', b.dateBecameBo ?? '—',
        ])
      )
      ctx.notice(
        'Reflects the Kenyan beneficial ownership framework — natural persons with 10%+ direct or indirect ' +
        'interest, or who otherwise exercise significant influence or control.'
      )
    } else {
      ctx.field('Declaration', 'Not yet confirmed — outstanding before filing.')
    }
  }

  // ---------- Trust property (trust only) ----------
  if (isTrust) {
    ctx.section('Trust Property')
    if ((input.trustProperty ?? []).length > 0) {
      ctx.table(
        ['Description', 'Category', 'Approx. value', 'Status'],
        [0.36, 0.22, 0.2, 0.22],
        (input.trustProperty ?? []).map((p) => [p.description, p.category, p.approxValue ?? '—', p.isVested ? 'Vested / transferred' : 'Intended'])
      )
    } else {
      ctx.field('Declaration', 'No trust property recorded yet.')
    }
    ctx.section('Protector / Enforcer')
    ctx.field('Appointed', input.protector ? 'Yes' : 'No')
    if (input.protector) {
      ctx.field('Name', input.protector.name)
      ctx.field('Powers', input.protector.powers ?? '—')
    }
  }

  // ---------- 9. Constitutional & registration basis ----------
  if (isTrust) {
    ctx.section('Trust Deed')
    ctx.field('Status', input.hasTrustDeed ? 'Already exists — uploaded' : 'To be prepared')
  } else if (isSociety) {
    ctx.section('Constitution')
    ctx.field('Status', input.hasConstitution ? 'Already exists — uploaded' : 'To be prepared')
  } else {
    ctx.section('Constitutional & Registration Basis')
    ctx.field('Articles of association', input.articlesType === 'custom' ? 'Custom articles' : input.articlesType === 'standard' ? 'Standard model articles' : '—')
    ctx.field('Multiple share classes declared', input.useMultipleShareClasses ? 'Yes' : 'No')
  }

  // ---------- 10. Required forms & filing preview ----------
  if (input.forms.length > 0) {
    ctx.section('Required Forms & Filing Preview')
    ctx.table(
      ['Form', 'Generated?', 'Signed?', 'Uploaded?', 'Pending action'],
      [0.28, 0.16, 0.14, 0.16, 0.26],
      input.forms.map((f) => [
        f.label, f.generated ? 'Yes' : 'No', f.signed ? 'Yes' : 'No', f.uploaded ? 'Yes' : 'No',
        f.uploaded ? '—' : f.generated ? 'Sign and upload' : 'Generate, sign, upload',
      ])
    )
  }

  // ---------- 11. Uploaded documents checklist ----------
  if (input.documentGroups.length > 0) {
    ctx.section('Uploaded Documents Checklist')
    for (const g of input.documentGroups) {
      ctx.subheading(g.label)
      for (const item of g.items) {
        ctx.checklistRow(item.name, item.provided)
      }
    }
  }

  // ---------- 12. Review exceptions & missing items ----------
  ctx.section('Review Exceptions & Missing Items')
  if (input.exceptions.length === 0) {
    ctx.field('Status', 'No outstanding exceptions — all mandatory information captured.')
  } else {
    for (const ex of input.exceptions) ctx.bullet(ex)
  }

  // ---------- 13. Client confirmation / sign-off ----------
  ctx.section('Client Confirmation')
  ctx.field('Reviewed and confirmed by', input.signature ?? '—')
  ctx.field('Confirmation statement', input.declared ? 'Confirmed accurate by applicant' : 'Not yet confirmed')
  ctx.field('Date of confirmation', input.declarationDate ? formatDate(new Date(input.declarationDate)) : '—')

  // ---------- 14. Next steps ----------
  ctx.section('Next Steps')
  ctx.bullet('Self-service: file this package yourself on the BRS eCitizen portal.')
  ctx.bullet('Assisted service: request LexReg Africa to handle BRS filing on your behalf.')
  ctx.bullet('Lawyer-assisted: a LexReg Africa lawyer reviews and files on your behalf.')
  ctx.bullet('Once BRS issues your certificate of incorporation, upload it back on your dashboard — along with the company KRA PIN certificate and, later, CR12 or beneficial ownership filing evidence — to activate your entity.')

  return doc.save()
}

// ------------------------------------------------------------------
// Page-flow + table helper — new page when content runs out of room.
// ------------------------------------------------------------------
class PageBuilder {
  private doc: PDFDocument
  private font: PDFFont
  private bold: PDFFont
  private page: PDFPage
  private y: number

  constructor(doc: PDFDocument, font: PDFFont, bold: PDFFont) {
    this.doc = doc
    this.font = font
    this.bold = bold
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    this.y = PAGE_HEIGHT - MARGIN
  }

  private ensureRoom(needed: number) {
    if (this.y - needed < MARGIN) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
      this.y = PAGE_HEIGHT - MARGIN
    }
  }

  spacer(h: number) {
    this.y -= h
  }

  title(text: string) {
    this.ensureRoom(30)
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 17, font: this.bold, color: BLACK })
    this.y -= 24
  }

  subtitle(text: string) {
    this.ensureRoom(20)
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 10, font: this.font, color: GRAY })
    this.y -= 20
  }

  rule(emphasis = false) {
    this.ensureRoom(16)
    this.page.drawLine({
      start: { x: MARGIN, y: this.y }, end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: emphasis ? 1.2 : 0.6, color: emphasis ? BLACK : RULE_GRAY,
    })
    this.y -= 20
  }

  notice(text: string) {
    const lines = wrapText(text, this.font, 9, CONTENT_WIDTH)
    this.ensureRoom(lines.length * 13 + 14)
    for (const line of lines) {
      this.page.drawText(line, { x: MARGIN, y: this.y, size: 9, font: this.font, color: GRAY })
      this.y -= 13
    }
    this.y -= 10
  }

  section(text: string) {
    this.ensureRoom(28)
    this.page.drawText(text.toUpperCase(), { x: MARGIN, y: this.y, size: 10.5, font: this.bold, color: BLACK })
    this.y -= 6
    this.page.drawLine({
      start: { x: MARGIN, y: this.y }, end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.6, color: RULE_GRAY,
    })
    this.y -= 16
  }

  subheading(text: string) {
    this.ensureRoom(18)
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 9.5, font: this.bold, color: BLACK })
    this.y -= 15
  }

  field(label: string, value: string) {
    const lines = wrapText(value, this.font, 9.5, CONTENT_WIDTH - 160)
    this.ensureRoom(Math.max(16, lines.length * 13))
    this.page.drawText(label, { x: MARGIN, y: this.y, size: 9.5, font: this.font, color: GRAY })
    for (const [i, line] of lines.entries()) {
      this.page.drawText(line, { x: MARGIN + 160, y: this.y - i * 13, size: 9.5, font: this.font, color: BLACK })
    }
    this.y -= Math.max(16, lines.length * 13)
  }

  checklistRow(name: string, provided: boolean) {
    this.ensureRoom(15)
    // Standard WinAnsi fonts can't encode ✓/○ — plain bracket marker instead.
    this.page.drawText(provided ? '[x]' : '[ ]', { x: MARGIN, y: this.y, size: 9, font: this.bold, color: provided ? GOOD : WARN })
    this.page.drawText(name, { x: MARGIN + 26, y: this.y, size: 9.5, font: this.font, color: BLACK })
    this.page.drawText(provided ? 'Provided' : 'Pending', { x: PAGE_WIDTH - MARGIN - 60, y: this.y, size: 8.5, font: this.font, color: provided ? GOOD : WARN })
    this.y -= 14
  }

  bullet(text: string) {
    const lines = wrapText(text, this.font, 9.5, CONTENT_WIDTH - 14)
    this.ensureRoom(lines.length * 13 + 4)
    this.page.drawText('•', { x: MARGIN, y: this.y, size: 9.5, font: this.bold, color: BLACK })
    for (const [i, line] of lines.entries()) {
      this.page.drawText(line, { x: MARGIN + 14, y: this.y - i * 13, size: 9.5, font: this.font, color: BLACK })
    }
    this.y -= lines.length * 13 + 4
  }

  // Simple table: header row (bold, ruled) + data rows. Cells are
  // truncated to one line with an ellipsis rather than wrapped — keeps
  // row heights predictable across wide tables (directors, shareholders,
  // BO, forms) without a full multi-line-cell layout engine.
  table(headers: string[], widthFractions: number[], rows: string[][]) {
    const widths = widthFractions.map((f) => f * CONTENT_WIDTH)
    const xs: number[] = []
    let acc = MARGIN
    for (const w of widths) { xs.push(acc); acc += w }

    this.ensureRoom(20)
    for (const [i, h] of headers.entries()) {
      this.page.drawText(h, { x: xs[i], y: this.y, size: 8.5, font: this.bold, color: BLACK })
    }
    this.y -= 5
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE_WIDTH - MARGIN, y: this.y }, thickness: 0.6, color: BLACK })
    this.y -= 13

    for (const row of rows) {
      this.ensureRoom(14)
      for (const [i, cell] of row.entries()) {
        const truncated = truncateToWidth(cell, this.font, 8.5, widths[i] - 6)
        this.page.drawText(truncated, { x: xs[i], y: this.y, size: 8.5, font: this.font, color: BLACK })
      }
      this.y -= 14
    }
    this.y -= 8
  }
}

function truncateToWidth(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  let result = text
  while (result.length > 1 && font.widthOfTextAtSize(`${result}…`, size) > maxWidth) {
    result = result.slice(0, -1)
  }
  return `${result}…`
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(trial, size) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = trial
    }
  }
  if (current) lines.push(current)
  return lines
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })
}
