export type InformalCategory = 'registration' | 'tax' | 'governance' | 'records' | 'contracts'

export type InformalOption = { label: string; points: number }

export type InformalQuestion = {
  id: string
  category: InformalCategory
  prompt: string
  options: InformalOption[]
}

export const CATEGORY_LABELS: Record<InformalCategory, string> = {
  registration: 'Registration Status',
  tax: 'Tax Compliance',
  governance: 'Governance Practices',
  records: 'Record-Keeping',
  contracts: 'Contracts',
}

export const CATEGORY_GAP_ADVICE: Record<InformalCategory, string> = {
  registration:
    'Registering with BRS gives your business a legal identity — it unlocks contracts, loans, and tenders that require a certificate of incorporation.',
  tax: 'Regular KRA filing and proper invoicing protect you from penalties and build the compliance record tenders and lenders check for.',
  governance:
    'Clear roles and documented decisions prevent disputes between owners and make the business easier to hand over or sell later.',
  records:
    'Separating personal and business finances, and keeping organised records, is the first thing every lender and auditor checks.',
  contracts:
    'Written agreements with clients, suppliers, and staff protect you legally and are usually required once you register formally.',
}

export const INFORMAL_QUESTIONS: InformalQuestion[] = [
  {
    id: 'reg_1',
    category: 'registration',
    prompt: 'Is your business registered with the Business Registration Service (BRS)?',
    options: [
      { label: 'Not registered', points: 0 },
      { label: 'Registered, certificate not yet received', points: 1 },
      { label: 'Registered, certificate received but not on file with LexReg', points: 2 },
      { label: 'Fully registered and certificate on file', points: 3 },
    ],
  },
  {
    id: 'reg_2',
    category: 'registration',
    prompt: 'Do you have a KRA PIN for your business, separate from your personal PIN?',
    options: [
      { label: 'No', points: 0 },
      { label: 'Applied, waiting for approval', points: 1 },
      { label: 'Yes, but not fully linked on iTax', points: 2 },
      { label: 'Yes, fully active', points: 3 },
    ],
  },
  {
    id: 'reg_3',
    category: 'registration',
    prompt: 'Have you obtained a single business permit from your county government?',
    options: [
      { label: 'No', points: 0 },
      { label: 'In progress', points: 1 },
      { label: 'Yes, but expired and needs renewal', points: 2 },
      { label: 'Yes, current', points: 3 },
    ],
  },
  {
    id: 'tax_1',
    category: 'tax',
    prompt: 'How often do you file tax returns (VAT / Income Tax) with KRA?',
    options: [
      { label: 'Never filed', points: 0 },
      { label: 'Filed once or twice, irregularly', points: 1 },
      { label: 'File most periods but sometimes late', points: 2 },
      { label: 'File every period, on time', points: 3 },
    ],
  },
  {
    id: 'tax_2',
    category: 'tax',
    prompt: 'Do you issue receipts or invoices for sales?',
    options: [
      { label: 'No', points: 0 },
      { label: 'Sometimes, informally', points: 1 },
      { label: 'Yes, but not sequentially numbered', points: 2 },
      { label: 'Yes, sequentially numbered and recorded', points: 3 },
    ],
  },
  {
    id: 'tax_3',
    category: 'tax',
    prompt: 'Are you aware of and compliant with turnover tax or presumptive tax obligations (if applicable to you)?',
    options: [
      { label: 'Not aware', points: 0 },
      { label: 'Aware, but not compliant', points: 1 },
      { label: 'Partially compliant', points: 2 },
      { label: 'Fully compliant', points: 3 },
    ],
  },
  {
    id: 'gov_1',
    category: 'governance',
    prompt: 'If there is more than one owner or partner, are roles clearly defined?',
    options: [
      { label: 'No — informal arrangement only', points: 0 },
      { label: 'Verbal agreement only', points: 1 },
      { label: 'Written, but outdated', points: 2 },
      { label: 'Written and current (or single owner)', points: 3 },
    ],
  },
  {
    id: 'gov_2',
    category: 'governance',
    prompt: 'Do you hold regular meetings or reviews to make business decisions?',
    options: [
      { label: 'Never', points: 0 },
      { label: 'Rarely, ad hoc', points: 1 },
      { label: 'Occasionally, informal notes', points: 2 },
      { label: 'Regularly, documented', points: 3 },
    ],
  },
  {
    id: 'gov_3',
    category: 'governance',
    prompt: 'Is there a succession or continuity plan if the owner becomes unavailable?',
    options: [
      { label: 'No plan', points: 0 },
      { label: 'Informal understanding only', points: 1 },
      { label: 'Partial written plan', points: 2 },
      { label: 'Full written plan', points: 3 },
    ],
  },
  {
    id: 'rec_1',
    category: 'records',
    prompt: 'Do you keep business finances separate from personal finances?',
    options: [
      { label: 'No — all mixed', points: 0 },
      { label: 'Partially separated', points: 1 },
      { label: 'Mostly separated, manual records', points: 2 },
      { label: 'Fully separated, digital bookkeeping', points: 3 },
    ],
  },
  {
    id: 'rec_2',
    category: 'records',
    prompt: 'How do you store important business documents (permits, contracts, receipts)?',
    options: [
      { label: 'Not stored / scattered', points: 0 },
      { label: 'Physical files, disorganised', points: 1 },
      { label: 'Physical files, organised', points: 2 },
      { label: 'Digital and physical, organised', points: 3 },
    ],
  },
  {
    id: 'rec_3',
    category: 'records',
    prompt: 'Do you track your business assets and inventory?',
    options: [
      { label: 'No tracking', points: 0 },
      { label: 'Rough mental estimate', points: 1 },
      { label: 'Basic written log', points: 2 },
      { label: 'Systematic tracking (spreadsheet or software)', points: 3 },
    ],
  },
  {
    id: 'con_1',
    category: 'contracts',
    prompt: 'Do you use written contracts or agreements with suppliers and clients?',
    options: [
      { label: 'Never — verbal only', points: 0 },
      { label: 'Rarely', points: 1 },
      { label: 'Sometimes, informal templates', points: 2 },
      { label: 'Yes, consistently', points: 3 },
    ],
  },
  {
    id: 'con_2',
    category: 'contracts',
    prompt: 'Do you have written employment agreements with any staff or casual workers?',
    options: [
      { label: 'No staff, or no agreements', points: 0 },
      { label: 'Verbal only', points: 1 },
      { label: 'Written, but informal', points: 2 },
      { label: 'Written, formal contracts', points: 3 },
    ],
  },
  {
    id: 'con_3',
    category: 'contracts',
    prompt: 'Have you had a business dispute (payment, supplier, staff) that lacked written proof to resolve it?',
    options: [
      { label: 'Yes, frequently', points: 0 },
      { label: 'Yes, occasionally', points: 1 },
      { label: 'Rarely', points: 2 },
      { label: 'Never — always documented', points: 3 },
    ],
  },
]

export const MAX_POINTS_PER_QUESTION = 3
export const TOTAL_QUESTIONS = INFORMAL_QUESTIONS.length
export const MAX_SCORE = TOTAL_QUESTIONS * MAX_POINTS_PER_QUESTION

export type InformalGap = {
  category: InformalCategory
  label: string
  advice: string
  score: number
}

export type InformalResult = {
  score: number
  categoryScores: Record<InformalCategory, number>
  gaps: InformalGap[]
  recommendedPath: 'new_entity' | 'keep_improving'
}

const ALL_CATEGORIES: InformalCategory[] = ['registration', 'tax', 'governance', 'records', 'contracts']

export function computeInformalResult(answers: Record<string, number>): InformalResult {
  const totals: Record<InformalCategory, { sum: number; count: number }> = {
    registration: { sum: 0, count: 0 },
    tax: { sum: 0, count: 0 },
    governance: { sum: 0, count: 0 },
    records: { sum: 0, count: 0 },
    contracts: { sum: 0, count: 0 },
  }

  let totalPoints = 0
  for (const q of INFORMAL_QUESTIONS) {
    const optionIndex = answers[q.id]
    const option = q.options[optionIndex]
    const points = option ? option.points : 0
    totalPoints += points
    totals[q.category].sum += points
    totals[q.category].count += 1
  }

  const categoryScores = Object.fromEntries(
    ALL_CATEGORIES.map((cat) => {
      const { sum, count } = totals[cat]
      const max = count * MAX_POINTS_PER_QUESTION
      return [cat, max > 0 ? Math.round((sum / max) * 100) : 0]
    })
  ) as Record<InformalCategory, number>

  const score = Math.round((totalPoints / MAX_SCORE) * 100)

  const gaps: InformalGap[] = ALL_CATEGORIES
    .filter((cat) => categoryScores[cat] < 70)
    .sort((a, b) => categoryScores[a] - categoryScores[b])
    .map((cat) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      advice: CATEGORY_GAP_ADVICE[cat],
      score: categoryScores[cat],
    }))

  return {
    score,
    categoryScores,
    gaps,
    recommendedPath: score < 70 ? 'keep_improving' : 'new_entity',
  }
}
