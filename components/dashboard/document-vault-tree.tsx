'use client'

import { useState } from 'react'
import { IconChevronRight, IconExternalLink, IconFileText, IconFolder, IconUser } from '@tabler/icons-react'

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

const FORM_DOCUMENT_TYPES = new Set(['signed_cr1', 'signed_cr2', 'signed_cr8', 'statement_of_nominal_capital', 'signed_bof1', 'signed_bn2', 'partnership_agreement', 'trust_deed', 'constitution', 'custom_articles'])

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
      <div className="card card-pad">
        <p className="t-footnote t-3">No documents on file yet.</p>
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
    const body = (
      <>
        <IconFileText size={17} stroke={1.75} aria-hidden="true" style={{ color: 'var(--label-3)', flex: 'none' }} />
        <span className="name t-subhead" style={{ fontWeight: 500 }}>{previewingId === doc.id ? 'Opening…' : doc.name}</span>
        <IconExternalLink size={15} stroke={1.75} aria-hidden="true" style={{ color: 'var(--label-3)', flex: 'none' }} />
      </>
    )
    if (doc.url) {
      return (
        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="file-row vault-file" style={{ color: 'var(--label)' }} title={doc.name}>
          {body}
        </a>
      )
    }
    return (
      <button type="button" onClick={() => onOpen?.(doc)} disabled={previewingId === doc.id} className="file-row vault-file w-full text-left disabled:opacity-50" style={{ color: 'var(--label)' }} title={doc.name}>
        {body}
      </button>
    )
  }

  const Chevron = ({ open }: { open: boolean }) => (
    <IconChevronRight size={15} stroke={2} aria-hidden="true" className="shrink-0" style={{ color: 'var(--label-3)', transform: open ? 'rotate(90deg)' : undefined, transition: 'transform var(--dur-snappy) var(--ease-spring)' }} />
  )

  return (
    <section className="card" aria-label="Document vault">
      <div className="card-head">
        <h2>All documents</h2>
        <span className="pill t-num">{documents.length}</span>
      </div>
      <div className="flex flex-col pb-2">
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
            <div key={cat} style={{ borderTop: 'var(--hairline-soft)' }}>
              <button
                type="button"
                onClick={() => setOpenCategories((prev) => ({ ...prev, [cat]: !isOpen }))}
                aria-expanded={isOpen}
                className="list-row is-link"
                style={{ paddingInline: 20, minHeight: 48 }}
              >
                <Chevron open={isOpen} />
                <span className="icon-tile" aria-hidden="true" style={{ width: 28, height: 28 }}><IconFolder size={16} stroke={1.75} /></span>
                <span className="t-subhead flex-1" style={{ color: 'var(--label)', fontWeight: 600 }}>{cat}</span>
                <span className="t-footnote t-3 t-num">{docs.length}</span>
              </button>

              {isOpen && (
                <div className="fade flex flex-col gap-1.5 pb-3 pl-[52px] pr-5">
                  {people.map((person) => {
                    const personKey = `${cat}:${person}`
                    const personOpen = openPeople[personKey] ?? true
                    const personDocs = byPerson.get(person)!
                    return (
                      <div key={person} className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => setOpenPeople((prev) => ({ ...prev, [personKey]: !personOpen }))}
                          aria-expanded={personOpen}
                          className="flex min-h-9 w-full items-center gap-2 text-left"
                        >
                          <Chevron open={personOpen} />
                          <IconUser size={15} stroke={1.75} aria-hidden="true" style={{ color: 'var(--label-3)' }} />
                          <span className="t-footnote t-2 flex-1" style={{ fontWeight: 500 }}>{person}</span>
                          <span className="t-footnote t-3 t-num">{personDocs.length}</span>
                        </button>
                        {personOpen && (
                          <div className="fade flex flex-col gap-1.5 pl-6">
                            {personDocs.map((d) => <DocLink key={d.id} doc={d} />)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {unassigned.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {people.length > 0 && <p className="t-eyebrow pt-1">General</p>}
                      {unassigned.map((d) => <DocLink key={d.id} doc={d} />)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
