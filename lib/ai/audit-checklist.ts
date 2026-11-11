// LexAudit checklist — PLACEHOLDER until Charles supplies the real one.
// Each item becomes one finding in the draft report; the lawyer edits and
// signs every finding before anything reaches the client.
export type AuditCheck = { id: string; area: string; question: string; evidence: string[]; placeholder: true }

export const AUDIT_CHECKLIST: AuditCheck[] = [
  { id: 'incorporation', area: 'Incorporation', question: 'Is the certificate of incorporation on file and does it match the registry record?', evidence: ['certificate_of_incorporation', 'cr12'], placeholder: true },
  { id: 'directors', area: 'Directors and officers', question: 'Do the directors on the CR12 match the register of directors, with IDs and KRA PINs on file?', evidence: ['cr12', 'id_copy', 'kra_pin'], placeholder: true },
  { id: 'shareholding', area: 'Share capital', question: 'Does the share register reconcile with the CR12 and the allotted share capital?', evidence: ['cr12', 'memart'], placeholder: true },
  { id: 'beneficial_ownership', area: 'Beneficial ownership', question: 'Is a beneficial ownership register kept and a signed BOF-1 lodged?', evidence: ['bof1'], placeholder: true },
  { id: 'annual_returns', area: 'Annual returns', question: 'Are annual returns filed up to date with the Registrar?', evidence: ['annual_return'], placeholder: true },
  { id: 'tax', area: 'Tax registration', question: 'Is the company KRA PIN certificate on file?', evidence: ['kra_pin'], placeholder: true },
  { id: 'data_protection', area: 'Data protection', question: 'Is the business registered with the ODPC if it handles personal data (Data Protection Act 2019)?', evidence: ['odpc_certificate'], placeholder: true },
]
