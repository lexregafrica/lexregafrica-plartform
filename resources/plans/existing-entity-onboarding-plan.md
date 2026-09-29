# Existing Registered Entity Onboarding — Execution Plan

Source: Charles's 8 developer briefs (Sep 2026) — Limited Company (+PLC), Sole Proprietorship,
General Partnership, LLP, Company Limited by Guarantee, Society, Family Trust, Charitable Trust.

## What every brief shares (build once — Phase 0)

1. **Entry + classification** — "I already have a registered…" → entity type → sub-type
   (PLC vs private; GP vs LP vs LLP; Registered / Incorporated / Legacy trust; Society registered vs exempted).
   Name + registration number captured first as matching keys. Wrong-form records route to the right flow.
2. **Configurable document pack per type** — `EXISTING_DOC_PACKS[type]`: document type, label, priority
   (primary / strong / recommended / conditional), treatment (identity anchor / current-state / formation /
   governance / change / compliance), fields it can supply, missing-document impact + behaviour.
   Versioned config, not hard-coded (every brief insists on this: BRS forms change).
3. **Extraction with field-level provenance** — OCR results stay *proposed*. Each field stores
   `{ value, sources: [{documentId, documentType, documentDate}], state, history[] }`.
   States: `verified` / `extracted_needs_confirmation` / `conflicting` / `missing` (+ `legacy_transitional` for trusts).
   Superseded values move into `history`, never deleted.
4. **Reconciliation hierarchy** — per-type priority list (e.g. Official Search > later change filings >
   BOF-1 > incorporation docs > unsupported user assertion). Field-specific, not "newest document wins".
5. **Discrepancy screen** — conflicts side-by-side with document name + date; user picks current value;
   losing value kept as history; a regularisation task is created when the chosen value isn't registry-evidenced.
6. **Missing-document gaps** — never block on history docs; mark fields unverified and create follow-up tasks
   in `compliance_events`.
7. **Review & confirm** — one screen, every material field shows its 4-state badge. Confirming never
   upgrades unsupported data to "registry verified".
8. **Status model** — Draft → Extracted → Review required → Provisionally onboarded → Verified onboarded →
   Compliance review due (+ Legacy/transitional for trusts). Stored on `entities`.
9. **Compliance baseline** — closing questionnaire per type ("any changes since the latest registry record?",
   staff? regulated activity? permits?) generating targeted tasks, not a generic checklist.
10. **Reusable person profiles** — match by ID/passport then KRA PIN; never by name alone; one person, many
    role badges. Needs a new `person_profiles` table (organisation-scoped, RLS, soft delete) + role links.

## Carry over everything already fixed/standardised in the new-entity flows

- `CorporateFields` (corporate participant: CR12/KRA/certificate OCR, representative ID/KRA/photo,
  board-resolution upload, corporate trustee types) — reuse, not re-implement.
- `NoAutofillInput` on all identity fields (Chrome autofill leaked the signed-in user's name).
- Person-tagged uploads: `personId` tags, id-only matching, `replacesFilePath`, one current doc per
  person per type, superseded kept in history; visible OCR failure messages; `formTokenRef` guard.
- Passport photo wherever ID + KRA are asked.
- Address rules: county / P.O. Box / postal code required for Kenyan residents; foreign-address mode.
- Trust rules: `trusteeRuleError` (3 sitting individuals or 1 corporate for charitable; successors
  don't count; 18+; Kenyan citizen/resident), enforcers, settlor-also-beneficiary/trustee, charitable
  object categories, beneficiary details.
- Society membership/affiliation fields; entity wording (`entityNoun`), "What is…" guide links.
- Gemini → Groq OCR chain (upper-case reg numbers/PINs, ignore issuer contact details).
- Summary/package PDF: existing path gets an "Onboarding Verification Report" built on `lib/documents/idp.ts` sections.

## Build order (one entity at a time, each shippable for Charles to test)

| # | Flow | Why this order | Entity-specific work |
|---|------|----------------|----------------------|
| 0 | Shared engine | Everything depends on it | Items 1–10 above; refactor current 6-step existing wizard into config-driven steps |
| 1 | Private Limited Company | Existing wizard already ~70% there | CR1/CR2/CR8/Statement of Nominal Capital/BOF-1/Official Search (CR12) pack; subscribers ≠ current shareholders; shareholder ≠ BO; share capital module; secretary if ≥ KES 5M, else contact-person check |
| 1b | Public Limited Company | Conditional layer on #1 | Secretary records mandatory; expanded governance fields |
| 2 | Sole Proprietorship | Simplest; proves the engine on a non-company | Certificate + BN2 + Official Search (CR13) + BN4/BN5; one proprietor person profile; NO shares/directors/BO; permits/licences/staff conditional; risk education panel |
| 3 | General Partnership | Introduces agreement extraction | Partnership Agreement → structured governance (capital, profit share, authority, admission/retirement, disputes); "deed silent" flags; partners < 2 = urgent legal review |
| 4 | LLP | Reuses #3 + BO | Partner vs Manager roles separate; ≥1 natural-person manager; LLP BO register; annual return 30 days after anniversary; LLP9 change within 14 days; 7-year records |
| 5 | Company Limited by Guarantee | Reuses #1 minus shares | CR3 (not CR2); Member/Guarantor register with guarantee amount; CLG control-based BO questionnaire (no %); Articles extraction; CR29 annual return with financial statements; no tax-exempt assumption |
| 6 | Society | Constitution-driven | Form C/D, A, B, H, I; configurable officer titles; AGM + 31 March Form I tasks; officer-dispute state; member register access-controlled |
| 7 | Family Trust | Reuses new-entity trust rules | Registered / Incorporated / Legacy fork; section 99 transition tasks (24 months); deed extraction; trust asset register (intended ≠ vested); BO 21-day change task; non-trading check |
| 8 | Charitable Trust | Reuses #7 | Charitable objects + public-benefit class; donor/funding + restricted funds register; programmes mapped to objects; conflict register; tax exemption separate |

Each flow ships with: its doc-pack config, extraction prompts for its new document types, the review screen,
status + compliance tasks, the acceptance tests from its brief run as a checklist, and browser verification.

## Decisions needed before Phase 0

1. **Person profile scope** — per organisation for now (safest under RLS / DPA), or shared across organisations
   with consent later? Recommend per organisation now, keyed so cross-org linking can be added.
2. **Deep modules** (asset register, donor register, programmes, conflict register, meetings) — capture at
   onboarding as structured lists now, with the full workspace modules later? Recommend yes.
3. **Legal review routing** — flags (e.g. family trust trading, officer dispute) go to Charles's admin queue?
