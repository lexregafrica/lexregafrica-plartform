export type LegalBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[]; ordered?: boolean }
  | { type: 'table'; headers: string[]; rows: string[][] }

export type LegalSubsection = {
  heading?: string
  blocks: LegalBlock[]
}

export type LegalSection = {
  number: string
  heading: string
  blocks?: LegalBlock[]
  subsections?: LegalSubsection[]
}

export type LegalDocumentData = {
  title: string
  subtitle: string
  preparedFor: string
  preparedBy: string
  date: string
  status: string
  sections: LegalSection[]
  closing: string
}
