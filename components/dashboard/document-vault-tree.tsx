'use client'

import { useState } from 'react'

export type VaultDocument = {
  id: string
  name: string
  document_type: string | null
  tags?: Array<{ person?: string; personId?: string; role?: string }> | null
  // Pre-signed URL when the caller already has one (entity workspace,
  // signed server-side) — renders as a plain link. Omit and pass onOpen
  // instead when the URL needs to be fetched on click (onboarding wizard,
  // signed client-side from a private bucket).
  url?: string | null
}

const FORM_DOCUMENT_TYPES = new Set(['signed_cr1', 'signed_cr2', 'signed_cr8', 'statement_of_nominal_capital', 'signed_bof1', 'signed_bn2', 'partnership_agreement'])

// Which folder a document belongs in — category, then person inside it,
// mirroring the physical-folder mental model Charles described. Built off
// document_type plus the person tag captured at upload time.
export function vaultCategoryFor(doc: VaultDocument): string {
  const role = doc.tags?.[0]?.role
  if (doc.document_type === 'proof_of_address') return 'Registered office'
  if (doc.document_type && FORM_DOCUMENT_TYPES.has(doc.document_type)) return 'Registration forms'
  if (doc.document_type?.startsWith('corporate_') || doc.document_type === 'foreign_constitutional_documents') return 'Corporate parties'
  if (doc.document_type === 'director_id_copy' || doc.document_type === 'director_kra_pin_copy' || role === 'director') return 'Directors'
  if (doc.document_type === 'shareholder_id_copy' || doc.document_type === 'shareholder_kra_pin_copy' || role === 'shareholder') return 'Shareholders'
  if (doc.document_type === 'beneficial_owner_id_copy' || doc.document_type === 'beneficial_owner_kra_pin_copy' || role === 'beneficial_owner') return 'Beneficial owners'
  return 'Other'
}

const VAULT_CATEGORY_ORDER = ['Directors', 'Shareholders', 'Beneficial owners', 'Corporate parties', 'Registered office', 'Registration forms', 'Other']

// File-tree view of every document on an entity — category folders, then
// a person sub-folder inside where a tag exists, flat otherwise. Lives on
// the entity dashboard (Document Vault) — Charles call, 2026-08: business
// owners were having to jump into onboarding steps to confirm what they'd
// uploaded elsewhere; this collapses that into one browsable tree, and it
// stays useful after registration completes, when onboarding is done.
export function DocumentVaultTree({ documents, onOpen, previewingId }: {
  documents: VaultDocument[]
  onOpen?: (doc: VaultDocument) => void
  previewingId?: string | null
}) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({})
  const [openPeople, setOpenPeople] = useState<Record<string, boolean>>({})

  if (documents.length === 0) {
    return (
      <div className="ios-surface rounded-2xl p-4">
        <p className="text-ios-footnote" style={{ color: 'var(--system-label-2)' }}>No documents on file yet.</p>
      </div>
    )
  }

  const byCategory = new Map<string, VaultDocument[]>()
  for (const doc of documents) {
    const cat = vaultCategoryFor(doc)
    byCategory.set(cat, [...(byCategory.get(cat) ?? []), doc])
  }
  const categories = VAULT_CATEGORY_ORDER.filter((c) => byCategory.has(c))

  const DocLink = ({ doc }: { doc: VaultDocument }) => {
    if (doc.url) {
      return (
        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-left text-ios-caption1 truncate underline decoration-dotted"
          style={{ color: 'var(--system-label)' }}
        >
          {doc.name}
        </a>
      )
    }
    return (
      <button
        type="button"
        onClick={() => onOpen?.(doc)}
        disabled={previewingId === doc.id}
        className="block w-full text-left text-ios-caption1 truncate underline decoration-dotted disabled:opacity-50"
        style={{ color: 'var(--system-label)' }}
      >
        {previewingId === doc.id ? 'Opening…' : doc.name}
      </button>
    )
  }

  return (
    <div className="ios-surface rounded-2xl p-4 space-y-1">
      <p className="text-ios-caption1 font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--system-label-3)' }}>
        All documents ({documents.length})
      </p>
      {categories.map((cat) => {
        const docs = byCategory.get(cat)!
        const isOpen = openCategories[cat] ?? true
        const byPerson = new Map<string, VaultDocument[]>()
        for (const d of docs) {
          const person = d.tags?.[0]?.person ?? null
          const key = person ?? '__none__'
          byPerson.set(key, [...(byPerson.get(key) ?? []), d])
        }
        const people = [...byPerson.keys()].filter((k) => k !== '__none__')
        const unassigned = byPerson.get('__none__') ?? []

        return (
          <div key={cat} className="border-t first:border-t-0" style={{ borderColor: 'var(--system-fill-3)' }}>
            <button
              type="button"
              onClick={() => setOpenCategories((prev) => ({ ...prev, [cat]: !isOpen }))}
              className="w-full flex items-center gap-2 py-2.5 text-left"
            >
              <svg className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="var(--system-label-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 6 15 12 9 18" />
              </svg>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="var(--brand-navy)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
              </svg>
              <span className="text-ios-footnote font-semibold flex-1" style={{ color: 'var(--system-label)' }}>{cat}</span>
              <span className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>{docs.length}</span>
            </button>

            {isOpen && (
              <div className="pl-6 pb-2 space-y-0.5">
                {people.map((person) => {
                  const personKey = `${cat}:${person}`
                  const personOpen = openPeople[personKey] ?? true
                  const personDocs = byPerson.get(person)!
                  return (
                    <div key={person}>
                      <button
                        type="button"
                        onClick={() => setOpenPeople((prev) => ({ ...prev, [personKey]: !personOpen }))}
                        className="w-full flex items-center gap-2 py-1.5 text-left"
                      >
                        <svg className={`w-3 h-3 shrink-0 transition-transform ${personOpen ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="var(--system-label-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 6 15 12 9 18" />
                        </svg>
                        <span className="text-ios-caption1 font-medium flex-1" style={{ color: 'var(--system-label-2)' }}>{person}</span>
                        <span className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>{personDocs.length}</span>
                      </button>
                      {personOpen && (
                        <div className="pl-5 space-y-1 pb-1">
                          {personDocs.map((d) => <DocLink key={d.id} doc={d} />)}
                        </div>
                      )}
                    </div>
                  )
                })}
                {unassigned.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {people.length > 0 && (
                      <p className="text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>General</p>
                    )}
                    {unassigned.map((d) => <DocLink key={d.id} doc={d} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
