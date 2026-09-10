'use client'

// Single canonical address block, reused everywhere an address is
// captured — the registered office, and every person's (director,
// shareholder, beneficial owner, settlor, society member) residential
// address. Before this, each of those had its own scattered field set:
// some had building/street granularity and no postal-code lookup, others
// had the postal-code lookup but no building/street, others were just a
// bare free-text line — different field order, different labels, no
// county-before-postcode consistency. One shape, one order, one look,
// everywhere (2026-09-10).
import { KENYA_COUNTIES, KENYA_POSTAL_CODES, type AddressData } from '@/lib/onboarding/new-entity'

export type { AddressData }

const inputCls =
  'w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#800020]/30'
const inputStyle = {
  borderColor: 'var(--system-fill-3)',
  background: 'var(--system-bg)',
  color: 'var(--system-label)',
} as const
const labelCls = 'block text-ios-footnote font-medium mb-1.5'
const labelStyle = { color: 'var(--system-label-2)' } as const

function AddressField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls} style={labelStyle}>
        {label}
        {required && <span style={{ color: '#dc2626' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

export function AddressFields({
  value,
  onChange,
  requireCity = true,
  requireCounty = true,
  requirePostalCode = true,
  requirePostalAddress = true,
}: {
  value: AddressData
  onChange: (patch: Partial<AddressData>) => void
  requireCity?: boolean
  requireCounty?: boolean
  requirePostalCode?: boolean
  requirePostalAddress?: boolean
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <AddressField label="Building name">
          <input type="text" className={inputCls} style={inputStyle} value={value.buildingName ?? ''} onChange={(e) => onChange({ buildingName: e.target.value })} />
        </AddressField>
        <AddressField label="Street name">
          <input type="text" className={inputCls} style={inputStyle} value={value.streetName ?? ''} onChange={(e) => onChange({ streetName: e.target.value })} />
        </AddressField>
      </div>
      <AddressField label="City / Town" required={requireCity}>
        <input type="text" className={inputCls} style={inputStyle} value={value.city ?? ''} onChange={(e) => onChange({ city: e.target.value })} />
      </AddressField>
      <div className="grid grid-cols-2 gap-3">
        <AddressField label="Floor">
          <input type="text" className={inputCls} style={inputStyle} value={value.floorNumber ?? ''} onChange={(e) => onChange({ floorNumber: e.target.value })} />
        </AddressField>
        <AddressField label="Door / unit number">
          <input type="text" className={inputCls} style={inputStyle} value={value.doorNumber ?? ''} onChange={(e) => onChange({ doorNumber: e.target.value })} />
        </AddressField>
      </div>
      <AddressField label="County" required={requireCounty}>
        <select
          className={inputCls}
          style={inputStyle}
          value={value.county ?? ''}
          // Postal code is a lookup keyed to county — clear it on county
          // change so a stale code from the previous county can't linger.
          onChange={(e) => onChange({ county: e.target.value, postalCode: '' })}
        >
          <option value="">—</option>
          {KENYA_COUNTIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </AddressField>
      <div className="grid grid-cols-2 gap-3">
        <AddressField label="Postal code" required={requirePostalCode}>
          <select
            className={inputCls}
            style={inputStyle}
            value={value.postalCode ?? ''}
            onChange={(e) => onChange({ postalCode: e.target.value })}
            disabled={!value.county}
          >
            <option value="">{value.county ? '—' : 'Choose county first'}</option>
            {KENYA_POSTAL_CODES.filter((p) => p.county === value.county).map((p) => (
              <option key={p.code} value={p.code}>{p.code} — {p.area}</option>
            ))}
          </select>
        </AddressField>
        <AddressField label="Postal address" required={requirePostalAddress}>
          <input
            type="text"
            className={inputCls}
            style={inputStyle}
            placeholder="e.g. P.O. Box 1234-00100, Nairobi"
            value={value.postalAddress ?? ''}
            onChange={(e) => onChange({ postalAddress: e.target.value })}
          />
        </AddressField>
      </div>
      <AddressField label="Country">
        <input type="text" className={inputCls} style={inputStyle} value={value.country ?? 'Kenya'} onChange={(e) => onChange({ country: e.target.value })} />
      </AddressField>
    </>
  )
}

// Reads an AddressData out of a saved jsonb blob that might still be in
// the old scattered shape (a bare free-text line plus county/postalCode/
// postalAddress siblings, no building/street/floor/door split) rather
// than the new nested `address` object — so switching to the shared
// component doesn't blank out or lose anyone's already-saved address.
// The old free-text line (physicalAddress / residentialAddress /
// businessAddress, whichever that record used) lands in streetName —
// not a perfect split, but nothing is discarded, and it's editable.
export function readLegacyAddress(raw: Record<string, unknown> | null | undefined, legacyFreeText?: string | null): AddressData {
  const nested = raw?.structuredAddress
  if (nested && typeof nested === 'object') return nested as AddressData
  if (!raw && !legacyFreeText) return {}
  return {
    streetName: legacyFreeText || undefined,
    city: typeof raw?.city === 'string' ? raw.city : undefined,
    county: typeof raw?.county === 'string' ? raw.county : undefined,
    postalCode: typeof raw?.postalCode === 'string' ? raw.postalCode : undefined,
    postalAddress: typeof raw?.postalAddress === 'string' ? raw.postalAddress : (typeof raw?.postalAddressLine === 'string' ? raw.postalAddressLine : undefined),
  }
}

// Single-line read-only rendering — review screens, IDP, dashboard cards.
// Same field order as the form above, minus empty fields.
export function formatAddress(a: AddressData | null | undefined): string {
  if (!a) return '—'
  const line1 = [a.buildingName, a.streetName].filter(Boolean).join(', ')
  const line2 = [a.floorNumber ? `Floor ${a.floorNumber}` : null, a.doorNumber ? `Door ${a.doorNumber}` : null].filter(Boolean).join(', ')
  const parts = [
    line1 || null,
    line2 || null,
    a.city ?? null,
    a.county ?? null,
    a.postalCode ?? null,
    a.postalAddress ?? null,
    a.country && a.country.toLowerCase() !== 'kenya' ? a.country : null,
  ].filter((p): p is string => !!p)
  return parts.length > 0 ? parts.join(', ') : '—'
}
