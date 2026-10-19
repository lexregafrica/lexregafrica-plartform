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
import { KENYA_COUNTIES, KENYA_POSTAL_CODES, readLegacyAddress, formatAddress, type AddressData } from '@/lib/onboarding/new-entity'

export type { AddressData }
export { readLegacyAddress, formatAddress }

// Same field look as the design-system .input / .label (app/lexreg-ui.css)
const inputCls =
  'w-full px-3 py-2 rounded-[10px] border text-[15px] leading-6 focus:outline-none focus:ring-[3px] focus:ring-black/[0.06] focus:border-[#86868B]'
const inputStyle = {
  borderColor: 'var(--ink-200)',
  background: 'var(--surface)',
  color: 'var(--label)',
} as const
const labelCls = 'label mb-1.5'

function AddressField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required && <span className="req">*</span>}
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
        <AddressField label="P.O. Box" required={requirePostalAddress}>
          <input
            type="text"
            className={inputCls}
            style={inputStyle}
            placeholder="e.g. P.O. Box 1234-00100, Nairobi"
            value={value.postalAddress ?? ''}
            onChange={(e) => onChange({ postalAddress: e.target.value })}
          />
        </AddressField>
        <AddressField label="Postal code" required={requirePostalCode}>
          <select
            className={inputCls}
            style={inputStyle}
            value={value.postalCode ?? ''}
            onChange={(e) => onChange({ postalCode: e.target.value })}
          >
            <option value="">—</option>
            {(value.county ? KENYA_POSTAL_CODES.filter((p) => p.county === value.county) : KENYA_POSTAL_CODES).map((p) => (
              <option key={`${p.code}-${p.area}`} value={p.code}>{p.code} — {p.area}{value.county ? '' : ` (${p.county})`}</option>
            ))}
          </select>
        </AddressField>
      </div>
      <AddressField label="Country">
        <input type="text" className={inputCls} style={inputStyle} value={value.country ?? 'Kenya'} onChange={(e) => onChange({ country: e.target.value })} />
      </AddressField>
    </>
  )
}
