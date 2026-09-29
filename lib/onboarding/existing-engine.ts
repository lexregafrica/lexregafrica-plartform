// Existing-entity onboarding engine — shared across every entity type.
//
// Charles's "Existing Registered … Onboarding Developer Brief" series
// (Sep 2026) describes one engine with different document packs:
//   - uploaded documents are source evidence, OCR output is only ever a
//     *proposed* value until confirmed or reconciled;
//   - every material field keeps field-level provenance (which document,
//     which date) and its superseded values as history;
//   - conflicts are resolved field by field against a per-type source
//     hierarchy, never "newest document wins";
//   - missing historical documents never block onboarding — they leave the
//     affected fields unverified and open a follow-up task;
//   - the review screen shows one of four states per field, and user
//     confirmation never upgrades unsupported data to "registry verified".
//
// Everything here is pure (no Supabase, no React) so both the route and the
// wizard use the same rules, and they can be unit-tested.

export type DocPriority = 'primary' | 'strong' | 'recommended' | 'conditional'
export type DocTreatment =
  | 'identity_anchor'
  | 'current_state'
  | 'formation'
  | 'governance'
  | 'change'
  | 'beneficial_ownership'
  | 'compliance'
  | 'operational'
export type GapImpact = 'critical' | 'high' | 'medium' | 'low' | 'conditional'

export type DocSpec = {
  documentType: string
  title: string
  hint: string
  priority: DocPriority
  treatment: DocTreatment
  // What the system does when this document is missing (brief §10 table)
  missing: { impact: GapImpact; behaviour: string }
  // Lower rank = stronger source for current state (brief §8 hierarchy).
  // User-verified current evidence is rank 1 and is not a document.
  rank: number
  // Only asked for when the predicate holds (e.g. public companies only)
  when?: (ctx: PackContext) => boolean
  // Several files allowed (change filings, amendments, other)
  multiple?: boolean
}

export type PackContext = {
  subtype?: string
  nominalCapital?: number | null
}

// ------------------------------------------------------------------
// Field provenance
// ------------------------------------------------------------------
export type FieldSource = {
  documentId: string
  documentType: string
  documentName?: string
  documentDate?: string | null
  confidence?: number
}

export type FieldCandidate = { value: string; source: FieldSource; at: string }

export type FieldRecord = {
  // Every value any document proposed, oldest first. Never pruned — the
  // losing side of a conflict stays here as historical evidence.
  candidates: FieldCandidate[]
  // The value the user settled on (typed, picked from a conflict, or
  // accepted as extracted). Absent until confirmed.
  confirmed?: { value: string; at: string; fromDocumentId?: string }
  // Set when the field's value was pre-filled from a document (not typed)
  // — if that document is removed, the pre-fill goes with it.
  autoFilledFrom?: string
}

export type FieldState =
  | 'verified' // confirmed and supported by a document
  | 'extracted' // proposed by a document, not yet confirmed
  | 'conflicting' // documents disagree and the user hasn't resolved it
  | 'user_confirmed' // confirmed by the user, no document supports it yet
  | 'missing' // nothing proposed, nothing entered

export const FIELD_STATE_LABEL: Record<FieldState, string> = {
  verified: 'Verified from document',
  extracted: 'Extracted — please confirm',
  conflicting: 'Conflicting — choose the current value',
  user_confirmed: 'Confirmed by you — evidence outstanding',
  missing: 'Missing — evidence outstanding',
}

// Formatting differences between registry documents ("Ltd" vs "Limited",
// punctuation, spacing) are not conflicts.
export const normaliseValue = (v: string) =>
  v.toLowerCase().replace(/[.,]/g, '').replace(/\blimited\b/g, 'ltd').replace(/\s+/g, ' ').trim()

export function addCandidate(record: FieldRecord | undefined, value: string | null | undefined, source: FieldSource): FieldRecord {
  const rec: FieldRecord = record ? { ...record, candidates: [...record.candidates] } : { candidates: [] }
  if (value === null || value === undefined || !String(value).trim()) return rec
  const v = String(value).trim()
  // The same document re-read (retry, Replace of an identical scan) must
  // not count as a second, conflicting source.
  const dupe = rec.candidates.find((c) => c.source.documentId === source.documentId)
  if (dupe) {
    dupe.value = v
    dupe.source = source
    return rec
  }
  rec.candidates.push({ value: v, source, at: new Date().toISOString() })
  return rec
}

// Distinct values proposed, strongest source first per the pack's ranks.
export function distinctCandidates(record: FieldRecord | undefined, rankOf: (documentType: string) => number) {
  const out: Array<{ value: string; sources: FieldSource[]; rank: number }> = []
  for (const c of record?.candidates ?? []) {
    const hit = out.find((o) => normaliseValue(o.value) === normaliseValue(c.value))
    const rank = rankOf(c.source.documentType)
    if (hit) {
      hit.sources.push(c.source)
      hit.rank = Math.min(hit.rank, rank)
    } else {
      out.push({ value: c.value, sources: [c.source], rank })
    }
  }
  return out.sort((a, b) => a.rank - b.rank)
}

export function fieldState(record: FieldRecord | undefined, currentValue: string | null | undefined, rankOf: (t: string) => number): FieldState {
  const distinct = distinctCandidates(record, rankOf)
  const value = (currentValue ?? '').trim()
  const supported = !!value && distinct.some((d) => normaliseValue(d.value) === normaliseValue(value))
  if (record?.confirmed && normaliseValue(record.confirmed.value) === normaliseValue(value) && value) {
    return supported ? 'verified' : 'user_confirmed'
  }
  if (distinct.length > 1) return 'conflicting'
  if (distinct.length === 1) return value && !supported ? 'user_confirmed' : 'extracted'
  return value ? 'user_confirmed' : 'missing'
}

// Values proposed by a document that has since been removed or replaced
// stop counting as evidence. The document row is only soft-deleted, so its
// extraction stays in the vault history.
export function withLiveEvidence<T extends { fieldEvidence?: Partial<Record<string, FieldRecord>> }>(
  wizard: T,
  liveDocumentIds: Set<string>,
  rankOf: (documentType: string) => number = () => 6,
): T {
  if (!wizard.fieldEvidence) return wizard
  const out: Record<string, unknown> = { ...wizard }
  const fieldEvidence: Partial<Record<string, FieldRecord>> = {}
  for (const [k, rec] of Object.entries(wizard.fieldEvidence)) {
    if (!rec) continue
    const next: FieldRecord = { ...rec, candidates: rec.candidates.filter((c) => liveDocumentIds.has(c.source.documentId)) }
    // A pre-fill from a removed document is withdrawn: fall back to what
    // the remaining documents say, or blank. A value the user typed or
    // confirmed is theirs and stays.
    const removedValue = rec.candidates.find((c) => c.source.documentId === rec.autoFilledFrom)?.value
    const untouched = removedValue !== undefined && normaliseValue(String(out[k] ?? '')) === normaliseValue(removedValue)
    if (rec.autoFilledFrom && !liveDocumentIds.has(rec.autoFilledFrom) && !rec.confirmed && untouched) {
      const best = distinctCandidates(next, rankOf)[0]
      out[k] = best?.value ?? ''
      next.autoFilledFrom = best?.sources[0]?.documentId
    }
    fieldEvidence[k] = next
  }
  out.fieldEvidence = fieldEvidence
  return out as T
}

// Pre-fill value for a field: the strongest-ranked source, but only when
// the sources agree — a conflict leaves the choice to the user.
export function proposedValue(record: FieldRecord | undefined, rankOf: (t: string) => number): string | undefined {
  const distinct = distinctCandidates(record, rankOf)
  return distinct.length === 1 ? distinct[0].value : undefined
}

// ------------------------------------------------------------------
// Document gaps
// ------------------------------------------------------------------
export type DocumentGap = { spec: DocSpec; declaredUnavailable: boolean }

export function packFor(pack: DocSpec[], ctx: PackContext) {
  return pack.filter((d) => !d.when || d.when(ctx))
}

export function documentGaps(pack: DocSpec[], ctx: PackContext, uploadedTypes: Set<string>, unavailable: string[] = []): DocumentGap[] {
  return packFor(pack, ctx)
    .filter((d) => d.priority !== 'conditional' || d.missing.impact !== 'conditional')
    .filter((d) => !uploadedTypes.has(d.documentType) && d.documentType !== 'other')
    .map((spec) => ({ spec, declaredUnavailable: unavailable.includes(spec.documentType) }))
}

// ------------------------------------------------------------------
// Status model (brief §16) — shared names across all entity types
// ------------------------------------------------------------------
export type OnboardingStatus =
  | 'draft'
  | 'extracted'
  | 'review_required'
  | 'legacy_transitional'
  | 'provisionally_onboarded'
  | 'verified_onboarded'
  | 'compliance_review_due'

export const ONBOARDING_STATUS_LABEL: Record<OnboardingStatus, string> = {
  draft: 'Draft',
  extracted: 'Extracted',
  review_required: 'Review required',
  legacy_transitional: 'Legacy / transitional',
  provisionally_onboarded: 'Provisionally onboarded',
  verified_onboarded: 'Verified onboarded',
  compliance_review_due: 'Compliance review due',
}

// Status once the user activates: verified only when every identity-anchor
// and current-state document is on file and no material field is still
// conflicting or unsupported.
export function activationStatus(opts: {
  gaps: DocumentGap[]
  states: FieldState[]
  openTasks: number
}): OnboardingStatus {
  const anchorMissing = opts.gaps.some((g) => g.spec.treatment === 'identity_anchor' || g.spec.treatment === 'current_state')
  const unsupported = opts.states.some((s) => s === 'conflicting' || s === 'missing' || s === 'user_confirmed')
  if (anchorMissing || unsupported) return 'provisionally_onboarded'
  if (opts.openTasks > 0) return 'compliance_review_due'
  return 'verified_onboarded'
}

// ------------------------------------------------------------------
// People matching (brief §6): strong identifiers first, never merge on a
// similar name alone.
// ------------------------------------------------------------------
export const normaliseId = (v: string | null | undefined) => (v ?? '').replace(/[\s-]/g, '').toUpperCase()

export type MatchResult = 'same' | 'possible' | 'different'

export function matchPerson(
  a: { name?: string | null; idNumber?: string | null; kraPin?: string | null },
  b: { name?: string | null; idNumber?: string | null; kraPin?: string | null },
): MatchResult {
  const idA = normaliseId(a.idNumber)
  const idB = normaliseId(b.idNumber)
  if (idA && idB) return idA === idB ? 'same' : 'different'
  const pinA = normaliseId(a.kraPin)
  const pinB = normaliseId(b.kraPin)
  if (pinA && pinB) return pinA === pinB ? 'same' : 'different'
  // No shared identifier: an identical name is only a *possible* match —
  // it needs the user to confirm (repeated family names are common).
  const nA = normaliseValue(a.name ?? '')
  const nB = normaliseValue(b.name ?? '')
  if (nA && nA === nB) return 'possible'
  return 'different'
}

// ------------------------------------------------------------------
// Compliance baseline (brief §13): questions → targeted tasks
// ------------------------------------------------------------------
export type BaselineQuestion = {
  key: string
  question: string
  help?: string
  // Task opened when the answer is "yes" (a change not yet on the
  // registry) or "no"/"unsure" (evidence missing), as configured.
  taskOn: 'yes' | 'no' | 'no_or_unsure'
  task: { title: string; description: string; category: string; dueInDays: number }
  when?: (ctx: PackContext) => boolean
}

export type BaselineAnswer = 'yes' | 'no' | 'unsure'

export function baselineTasks(questions: BaselineQuestion[], answers: Record<string, BaselineAnswer | undefined>, ctx: PackContext) {
  return questions
    .filter((q) => !q.when || q.when(ctx))
    .filter((q) => {
      const a = answers[q.key]
      if (!a) return false
      if (q.taskOn === 'yes') return a === 'yes'
      if (q.taskOn === 'no') return a === 'no'
      return a === 'no' || a === 'unsure'
    })
    .map((q) => q.task)
}
