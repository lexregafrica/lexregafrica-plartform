'use client'

// Company / shareholding structure — Charles, 2026-09-30: the dashboard
// should show the company and shareholding structure and the people
// behind it. Holders sit above the entity with their stake, beneficial
// owners (who ultimately own or control it) above them, officers below.
// The wording follows the entity type: partners for a partnership,
// partners and managers for an LLP, the proprietor for a business name.

import { useEffect, useMemo, useState } from 'react'
import { ReactFlow, Background, Controls, Handle, Position, type Edge, type Node, type NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

export type StructureHolder = { id: string; name: string; stake: string | null; detail: string | null; isCorporate: boolean; isNominee?: boolean }
export type StructureOfficer = { id: string; name: string; role: string }
export type StructureOwner = { id: string; name: string; control: string | null }

type NodeData = { title: string; subtitle?: string | null; kind: 'entity' | 'holder' | 'corporate' | 'owner' | 'officer'; badge?: string | null }

const KIND_STYLE: Record<NodeData['kind'], { bg: string; border: string; fg: string; label: string }> = {
  entity: { bg: 'var(--brand-navy)', border: 'var(--brand-navy)', fg: '#FFFFFF', label: '' },
  holder: { bg: '#FFFFFF', border: 'var(--system-fill-3)', fg: 'var(--system-label)', label: 'Individual' },
  corporate: { bg: 'rgba(37,99,235,0.06)', border: 'rgba(37,99,235,0.35)', fg: 'var(--system-label)', label: 'Corporate' },
  owner: { bg: 'rgba(22,163,74,0.06)', border: 'rgba(22,163,74,0.4)', fg: 'var(--system-label)', label: 'Beneficial owner' },
  officer: { bg: 'var(--system-bg-2, #F7F7F8)', border: 'var(--system-fill-3)', fg: 'var(--system-label)', label: '' },
}

function StructureNode({ data }: NodeProps<Node<NodeData>>) {
  const st = KIND_STYLE[data.kind]
  return (
    <div className="rounded-2xl border px-3 py-2.5 text-left shadow-sm" style={{ width: 190, background: st.bg, borderColor: st.border, color: st.fg }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      {(data.badge || st.label) && (
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: data.kind === 'entity' ? 'rgba(255,255,255,0.75)' : 'var(--system-label-3)' }}>
          {data.badge ?? st.label}
        </p>
      )}
      <p className="text-[13px] font-semibold leading-snug break-words">{data.title}</p>
      {data.subtitle && (
        <p className="text-[11.5px] mt-0.5 leading-snug" style={{ color: data.kind === 'entity' ? 'rgba(255,255,255,0.85)' : 'var(--system-label-2)' }}>{data.subtitle}</p>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  )
}

const nodeTypes = { structure: StructureNode }

const ROW_GAP = 150
const LINE = 110 // between wrapped lines within one tier
const COL = 215

// Lays a tier out in centred lines of at most `perRow` nodes, so a phone
// gets a readable two-across grid instead of one tiny strip.
function tier<T>(items: T[], y: number, perRow: number, toNode: (item: T, x: number, y: number) => Node<NodeData>) {
  const nodes: Node<NodeData>[] = []
  for (let line = 0; line * perRow < items.length; line++) {
    const chunk = items.slice(line * perRow, line * perRow + perRow)
    const width = (chunk.length - 1) * COL
    chunk.forEach((item, i) => nodes.push(toNode(item, i * COL - width / 2 - 95, y + line * LINE)))
  }
  const height = Math.max(0, Math.ceil(items.length / perRow) - 1) * LINE
  return { nodes, height }
}

export function OwnershipStructure({ entityName, typeLabel, holders, holderNoun, officers, owners }: {
  entityName: string
  typeLabel: string
  holders: StructureHolder[]
  holderNoun: string // "Shareholders", "Partners", "Proprietor"
  officers: StructureOfficer[]
  owners: StructureOwner[]
}) {
  const [perRow, setPerRow] = useState(5)
  useEffect(() => {
    const update = () => setPerRow(window.innerWidth < 640 ? 2 : window.innerWidth < 1024 ? 3 : 5)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const { nodes, edges } = useMemo(() => {
    const nodes: Node<NodeData>[] = []
    const edges: Edge[] = []

    let y = 0
    const ownerTier = tier(owners, y, perRow, (o, x, ny) => ({
      id: `o-${o.id}`, type: 'structure', position: { x, y: ny }, draggable: false,
      data: { title: o.name, subtitle: o.control, kind: 'owner' as const },
    }))
    if (owners.length) y += ownerTier.height + ROW_GAP
    const holderTier = tier(holders, y, perRow, (h, x, ny) => ({
      id: `h-${h.id}`, type: 'structure', position: { x, y: ny }, draggable: false,
      data: { title: h.name, subtitle: h.detail, kind: h.isCorporate ? 'corporate' as const : 'holder' as const, badge: [h.isCorporate ? 'Corporate' : 'Individual', h.isNominee && 'Nominee', h.stake].filter(Boolean).join(' · ') },
    }))
    if (holders.length) y += holderTier.height + ROW_GAP
    const yEntity = y
    const officerTier = tier(officers, yEntity + ROW_GAP, perRow, (o, x, ny) => ({
      id: `d-${o.id}`, type: 'structure', position: { x, y: ny }, draggable: false,
      data: { title: o.name, kind: 'officer' as const, badge: o.role },
    }))

    nodes.push({ id: 'entity', type: 'structure', position: { x: -95, y: yEntity }, data: { title: entityName, subtitle: typeLabel, kind: 'entity' }, draggable: false })
    nodes.push(...ownerTier.nodes, ...holderTier.nodes, ...officerTier.nodes)

    for (const o of owners) {
      edges.push({ id: `e-o-${o.id}`, source: `o-${o.id}`, target: 'entity', style: { stroke: 'rgba(22,163,74,0.6)', strokeDasharray: '5 4' } })
    }
    for (const h of holders) {
      edges.push({
        id: `e-h-${h.id}`, source: `h-${h.id}`, target: 'entity',
        // On one line the stake reads on the connector; wrapped, it's on the card
        label: holders.length <= perRow ? h.stake ?? undefined : undefined,
        labelStyle: { fontSize: 11, fontWeight: 600, fill: 'var(--brand-navy)' },
        labelBgStyle: { fill: '#FFFFFF' },
        style: { stroke: 'var(--brand-navy)', strokeWidth: 1.5 },
      })
    }
    for (const o of officers) {
      edges.push({ id: `e-d-${o.id}`, source: 'entity', target: `d-${o.id}`, style: { stroke: 'var(--system-label-3)' } })
    }
    return { nodes, edges }
  }, [entityName, typeLabel, holders, officers, owners, perRow])

  return (
    <div className="space-y-3">
      <div className="h-[620px] w-full overflow-hidden rounded-[22px] bg-white md:h-[560px]">
        <ReactFlow
          key={perRow}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
          minZoom={0.3}
          maxZoom={1.5}
        >
          <Background gap={20} color="var(--system-fill-3)" />
          <Controls showInteractive={false} position="bottom-right" />
        </ReactFlow>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-ios-caption1" style={{ color: 'var(--system-label-3)' }}>
        <span><span className="mr-1 inline-block h-2 w-4 align-middle" style={{ background: 'var(--brand-navy)' }} />{holderNoun} (stake)</span>
        {owners.length > 0 && <span><span className="mr-1 inline-block h-0 w-4 border-t-2 border-dashed align-middle" style={{ borderColor: 'rgba(22,163,74,0.7)' }} />Ultimate ownership / control</span>}
        {holders.some((h) => h.isCorporate) && <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: 'rgba(37,99,235,0.35)' }} />Corporate holder</span>}
      </div>
    </div>
  )
}
