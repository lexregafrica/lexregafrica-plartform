"use client"

import { useState, useEffect } from "react"
import { motion } from "motion/react"
import {
  IconUpload,
  IconUserCheck,
  IconBuildingBank,
  IconCertificate,
  IconFileInvoice,
  IconBriefcase,
  IconGavel,
  IconFileText,
  IconCheck,
  IconLoader2,
  IconClock,
  IconMinus,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { TextReveal } from "@/components/ui/text-reveal"

/* ──────────────────────────────────────────────────────
   Shared FeatCard wrapper
   Each card entrance is scroll-triggered with stagger
────────────────────────────────────────────────────── */

interface FeatCardProps {
  title: string
  description: string
  children: React.ReactNode
  className?: string
  delay?: number
}

function FeatCard({ title, description, children, className = "", delay = 0 }: FeatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-5%" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay }}
      className={cn(
        "group relative flex flex-col gap-2 overflow-hidden rounded-[20px] p-4",
        "bg-white",
        "shadow-[0_0_0_1px_rgba(0,0,0,0.07),0_2px_6px_rgba(0,0,0,0.04)]",
        className
      )}
    >
      <div className="z-10 flex flex-col gap-1.5">
        <h3
          className="font-semibold text-sm tracking-tight"
          style={{ color: "#1A1A2E", fontFamily: "SF Pro Text, system-ui, sans-serif" }}
        >
          {title}
        </h3>
        <p
          className="text-xs leading-relaxed max-w-[90%]"
          style={{ color: "#737373", fontFamily: "SF Pro Text, system-ui, sans-serif" }}
        >
          {description}
        </p>
      </div>
      <div
        className="relative mt-2 flex-1 w-full rounded-[14px] overflow-hidden border"
        style={{ borderColor: "rgba(0,0,0,0.07)", background: "rgba(249,248,247,0.8)" }}
      >
        {children}
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────
   Card 1 – Registration Pipeline
   Documents flow: UPLOAD → OCR → VERIFY → BRS / CERT
   ───────────────────────────────────────────── */

type PipelineStep = "upload" | "ocr" | "review" | "brs" | "cert" | "complete"

type TablerIconComponent = React.ComponentType<{ size?: number; stroke?: number; className?: string }>

interface PipelineNode {
  id: string
  x: number
  y: number
  Icon: TablerIconComponent | null
  label: string
  type: "box" | "circle"
}

const PIPELINE_NODES: PipelineNode[] = [
  { id: "UPLOAD", x: 50,  y: 120, Icon: IconUpload,      label: "UPLOAD", type: "box" },
  { id: "OCR",    x: 125, y: 120, Icon: null,             label: "",       type: "circle" },
  { id: "VERIFY", x: 200, y: 120, Icon: IconUserCheck,    label: "VERIFY", type: "box" },
  { id: "BRS",    x: 280, y: 58,  Icon: IconBuildingBank, label: "BRS",    type: "box" },
  { id: "CERT",   x: 280, y: 182, Icon: IconCertificate,  label: "CERT",   type: "box" },
]

const NODE_STYLES: Record<string, { activeGrad: string; activeBorder: string; activeText: string }> = {
  UPLOAD: { activeGrad: "linear-gradient(to bottom, #C9A227, #a88520)", activeBorder: "#a88520", activeText: "#fff" },
  OCR:    { activeGrad: "linear-gradient(to bottom, #d97706, #b45309)", activeBorder: "#b45309", activeText: "#fff" },
  VERIFY: { activeGrad: "linear-gradient(to bottom, #1A1A2E, #0d0d1a)", activeBorder: "#0d0d1a", activeText: "#fff" },
  BRS:    { activeGrad: "linear-gradient(to bottom, #34d399, #059669)", activeBorder: "#047857", activeText: "#fff" },
  CERT:   { activeGrad: "linear-gradient(to bottom, #38bdf8, #0284c7)", activeBorder: "#0369a1", activeText: "#fff" },
}

interface FlowPath {
  id: string
  d: string
  activeSteps: PipelineStep[]
  color: string
}

const FLOW_PATHS: FlowPath[] = [
  { id: "upload-ocr",    d: "M 78 120 L 113 120",              activeSteps: ["upload"],          color: "#C9A227" },
  { id: "ocr-verify",   d: "M 137 120 L 172 120",             activeSteps: ["ocr", "review"],   color: "#1A1A2E" },
  { id: "verify-brs",   d: "M 200 92 L 200 58 L 252 58",      activeSteps: ["brs"],             color: "#10b981" },
  { id: "verify-cert",  d: "M 200 148 L 200 182 L 252 182",   activeSteps: ["cert"],            color: "#0ea5e9" },
  { id: "resp-ocr",     d: "M 172 120 L 137 120",             activeSteps: ["complete"],        color: "#C9A227" },
  { id: "resp-upload",  d: "M 113 120 L 78 120",              activeSteps: ["complete"],        color: "#C9A227" },
]

function nodeIsActive(nodeId: string, step: PipelineStep): boolean {
  switch (step) {
    case "upload":   return nodeId === "UPLOAD"
    case "ocr":      return nodeId === "OCR"
    case "review":   return nodeId === "VERIFY"
    case "brs":      return nodeId === "VERIFY" || nodeId === "BRS"
    case "cert":     return nodeId === "VERIFY" || nodeId === "CERT"
    case "complete": return nodeId === "VERIFY" || nodeId === "OCR" || nodeId === "UPLOAD"
    default:         return false
  }
}

const VW = 320
const VH = 240

function Card1() {
  const [step, setStep] = useState<PipelineStep>("upload")

  useEffect(() => {
    const steps: PipelineStep[] = ["upload", "ocr", "review", "brs", "cert", "complete"]
    let idx = 0
    const iv = setInterval(() => {
      idx = (idx + 1) % steps.length
      setStep(steps[idx])
    }, 1800)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="w-full h-full relative overflow-hidden select-none rounded-xl flex items-center justify-center p-2"
      style={{ background: "rgba(249,248,247,0.8)" }}>
      {/* Dot grid */}
      <svg className="absolute inset-0 w-full h-full" aria-hidden>
        <defs>
          <pattern id="pipeline-dots" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.75" fill="rgba(0,0,0,0.07)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pipeline-dots)" />
      </svg>

      {/* Connection + nodes SVG */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {/* Static base paths */}
        <path d="M 78 120 L 113 120"             fill="none" stroke="rgba(0,0,0,0.09)" strokeWidth="1" />
        <path d="M 137 120 L 172 120"            fill="none" stroke="rgba(0,0,0,0.09)" strokeWidth="1" />
        <path d="M 200 92 L 200 58 L 252 58"    fill="none" stroke="rgba(0,0,0,0.09)" strokeWidth="1" />
        <path d="M 200 148 L 200 182 L 252 182" fill="none" stroke="rgba(0,0,0,0.09)" strokeWidth="1" />

        {/* Animated flow overlays */}
        {FLOW_PATHS.map((p) => {
          if (!p.activeSteps.includes(step)) return null
          return (
            <g key={p.id}>
              <motion.path
                d={p.d} fill="none" stroke={p.color} strokeWidth="3.5" strokeOpacity="0.18"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
              />
              <motion.path
                d={p.d} fill="none" stroke={p.color} strokeWidth="1.5"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
              />
            </g>
          )
        })}

        {/* Nodes */}
        {PIPELINE_NODES.map((node) => {
          const isBox = node.type === "box"
          const w = isBox ? 56 : 24
          const h = isBox ? 56 : 24
          const active = nodeIsActive(node.id, step)
          const s = NODE_STYLES[node.id]

          return (
            <foreignObject
              key={node.id}
              x={node.x - w / 2} y={node.y - h / 2}
              width={w} height={h}
              className="overflow-visible"
            >
              <div className="w-full h-full flex items-center justify-center">
                {isBox && node.Icon ? (
                  <div
                    className="w-full h-full rounded-[14px] border flex flex-col items-center justify-center"
                    style={{
                      background: active ? s.activeGrad : "#fff",
                      borderColor: active ? s.activeBorder : "rgba(0,0,0,0.10)",
                      color: active ? "#fff" : "#9ca3af",
                      transition: "all 0.35s ease",
                      boxShadow: active
                        ? "inset 0 0.5px 0 rgba(255,255,255,0.4), 0 2px 6px rgba(0,0,0,0.12)"
                        : "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    <node.Icon size={18} stroke={1.5} />
                    <span className="text-[7.5px] font-mono font-bold tracking-wider mt-0.5 select-none">
                      {node.label}
                    </span>
                  </div>
                ) : (
                  /* OCR router node — spinning dashed circle */
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{
                      background: active ? "rgba(201,162,39,0.12)" : "rgba(255,255,255,0.9)",
                      borderColor: active ? "#C9A227" : "rgba(0,0,0,0.14)",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <motion.div
                      className="w-2.5 h-2.5 rounded-full border border-dashed"
                      style={{ borderColor: active ? "#C9A227" : "rgba(0,0,0,0.2)" }}
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
                    />
                  </div>
                )}
              </div>
            </foreignObject>
          )
        })}
      </svg>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Card 2 – Compliance Score
   Readiness score + weekly activity bars
   ───────────────────────────────────────────── */

function Card2() {
  const bars = [55, 70, 45, 88, 65, 90, 72]
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
  const [activeIdx, setActiveIdx] = useState(0)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  useEffect(() => {
    const iv = setInterval(() => setActiveIdx((p) => (p === 0 ? 1 : 0)), 3000)
    return () => clearInterval(iv)
  }, [])

  const stats = [
    { label: "Readiness", value: "87%",    trend: "+12%",  up: true  },
    { label: "Filings due", value: "3",    trend: "−2",    up: true  },
  ]

  return (
    <div className="w-full h-full flex flex-col gap-3 justify-between py-1 px-0.5">
      {/* Stats cards */}
      <div className="flex gap-3 pt-[0.625rem] pr-[0.625rem] pb-0.5 pl-0.5">
        {stats.map((s, i) => {
          const isActive = i === activeIdx || hoveredIdx === i
          return (
            <div key={i} className="flex-1 h-[76px] relative select-none">
              {/* Hatched background */}
              <div
                className="absolute inset-0 rounded-xl border"
                style={{
                  borderColor: "rgba(0,0,0,0.08)",
                  backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.025) 6px, rgba(0,0,0,0.025) 7px)",
                }}
              />
              {/* Foreground card */}
              <motion.div
                className="absolute inset-0 rounded-xl bg-white border p-3 cursor-pointer flex items-center justify-between gap-2"
                style={{ borderColor: "rgba(0,0,0,0.08)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" }}
                animate={{ x: isActive ? "0.5rem" : "0rem", y: isActive ? "-0.5rem" : "0rem" }}
                transition={{ type: "spring", stiffness: 200, damping: 16 }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] uppercase tracking-widest font-mono leading-none" style={{ color: "#9ca3af" }}>
                    {s.label}
                  </span>
                  <span className="text-base font-bold font-mono leading-none mt-1.5 tracking-tight" style={{ color: "#1A1A2E" }}>
                    {s.value}
                  </span>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={`text-[8px] font-mono font-bold ${s.up ? "text-emerald-500" : "text-rose-400"}`}>
                      {s.trend}
                    </span>
                    <span className="text-[8px] font-mono" style={{ color: "#d1d5db" }}>prev</span>
                  </div>
                </div>
                {/* Sparkline */}
                <div className="w-11 h-5 shrink-0">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 44 20">
                    <motion.path
                      d={i === 0 ? "M 0 16 L 14 10 L 28 13 L 44 4" : "M 0 4 L 14 12 L 28 9 L 44 15"}
                      fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1"
                      strokeLinecap="round" strokeLinejoin="round"
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.15, ease: "easeOut" }}
                    />
                    {(i === 0
                      ? [{ x: 0, y: 16 }, { x: 14, y: 10 }, { x: 28, y: 13 }, { x: 44, y: 4 }]
                      : [{ x: 0, y: 4  }, { x: 14, y: 12 }, { x: 28, y: 9  }, { x: 44, y: 15 }]
                    ).map((pt, idx) => (
                      <motion.circle
                        key={idx} cx={pt.x} cy={pt.y} r="1.5"
                        fill="white" stroke="rgba(0,0,0,0.22)" strokeWidth="1"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5 + idx * 0.08, duration: 0.25 }}
                      />
                    ))}
                  </svg>
                </div>
              </motion.div>
            </div>
          )
        })}
      </div>

      {/* Bar chart — weekly compliance activity */}
      <div className="flex-1 flex items-end gap-1.5 px-0.5 min-h-[72px]">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 h-full rounded-lg border relative overflow-hidden"
            style={{
              borderColor: "rgba(0,0,0,0.07)",
              backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.02) 6px, rgba(0,0,0,0.02) 7px)",
            }}
          >
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-t-[6px] border-t border-x"
              style={{
                background: "linear-gradient(to bottom, #C9A227, #a88520)",
                borderColor: "rgba(168,133,32,0.6)",
              }}
              initial={{ height: "0%" }}
              animate={{
                height: [`${h}%`, `${Math.min(95, h + 13)}%`, `${Math.max(10, h - 18)}%`, `${Math.min(90, h + 7)}%`, `${h}%`],
              }}
              transition={{ repeat: Infinity, duration: 3 + (i % 3) * 0.8, ease: "easeInOut", delay: i * 0.1 }}
            />
          </div>
        ))}
      </div>

      {/* X axis labels */}
      <div className="flex gap-1.5 px-0.5">
        {days.map((d, i) => (
          <p key={i} className="flex-1 text-center text-[6.5px] font-mono font-medium" style={{ color: "#9ca3af" }}>
            {d}
          </p>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Card 3 – Compliance Task Feed
   Stacked carousel of regulatory obligations
   ───────────────────────────────────────────── */

type TaskStatus = "done" | "running" | "waiting" | "idle"

const TASK_STATUS: Record<TaskStatus, {
  Icon: TablerIconComponent
  color: string
  bg: string
  grad: string
  border: string
}> = {
  done:    { Icon: IconCheck,    color: "text-lime-600",  bg: "bg-lime-500/15",  grad: "from-lime-400 to-lime-600",  border: "border-lime-600" },
  running: { Icon: IconLoader2,  color: "text-amber-600", bg: "bg-amber-400/15", grad: "from-amber-400 to-amber-600", border: "border-amber-500" },
  waiting: { Icon: IconClock,    color: "text-sky-600",   bg: "bg-sky-400/15",   grad: "from-sky-400 to-sky-600",    border: "border-sky-500" },
  idle:    { Icon: IconMinus,    color: "text-gray-400",  bg: "bg-gray-300/30",  grad: "from-zinc-300 to-zinc-500",  border: "border-zinc-400" },
}

const COMPLIANCE_TASKS = [
  { task: "BRS Registration",  action: "Certificate of Incorporation obtained",     status: "done"    as TaskStatus, t: "Jan 24" },
  { task: "KRA PIN",           action: "Tax PIN registered with Revenue Authority", status: "done"    as TaskStatus, t: "Feb 3"  },
  { task: "Annual Returns",    action: "Filing 2025 annual returns with BRS…",      status: "running" as TaskStatus, t: "now"   },
  { task: "NSSF Registration", action: "Awaiting payroll data to complete",         status: "waiting" as TaskStatus, t: "—"     },
  { task: "ODPC Audit",        action: "Data protection review scheduled",          status: "idle"    as TaskStatus, t: "—"     },
]

function Card3() {
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => {
      setActiveIdx((p) => (p + 1) % COMPLIANCE_TASKS.length)
    }, 2200)
    return () => clearInterval(iv)
  }, [])

  const getSlot = (i: number) => {
    const N = COMPLIANCE_TASKS.length
    let rel = i - activeIdx
    if (rel > Math.floor(N / 2)) rel -= N
    if (rel < -Math.floor(N / 2)) rel += N
    return rel
  }

  const Y: Record<string, number> = { "-2": -68, "-1": -38, "0": 0, "1": 38, "2": 68 }

  return (
    <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
      {COMPLIANCE_TASKS.map((task, i) => {
        const slot = getSlot(i)
        const si = TASK_STATUS[task.status]
        const abs = Math.abs(slot)
        const isActive = slot === 0
        const isVisible = abs <= 2

        return (
          <motion.div
            key={task.task}
            className="absolute left-0 right-0 mx-auto px-1.5"
            style={{ zIndex: isActive ? 30 : abs === 1 ? 20 : 10 }}
            animate={{
              y: isVisible ? (Y[String(slot)] ?? (slot < 0 ? -120 : 120)) : slot < 0 ? -150 : 150,
              scale: isActive ? 1 : abs === 1 ? 0.93 : 0.87,
              opacity: isVisible ? (isActive ? 1 : abs === 1 ? 0.6 : 0.28) : 0,
            }}
            transition={{
              y: { type: "spring", stiffness: 500, damping: 35 },
              scale: { type: "spring", stiffness: 500, damping: 35 },
              opacity: { duration: 0.25, ease: "easeOut" },
            }}
          >
            <div
              className={`w-full rounded-2xl border flex items-center gap-2.5 ${isActive ? "px-3 py-2.5" : "px-2.5 py-1.5"}`}
              style={{
                borderColor: isActive ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.06)",
                background: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                boxShadow: isActive ? "0 1px 4px rgba(0,0,0,0.05)" : "none",
              }}
            >
              {/* Status icon badge */}
              <div
                className={`shrink-0 rounded-[8px] flex items-center justify-center text-white bg-gradient-to-b ${si.grad} border ${si.border} shadow-sm transition-all duration-300 ${isActive ? "w-8 h-8" : "w-5 h-5"}`}
                style={{ boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.5), 0 1px 3px rgba(0,0,0,0.1)" }}
              >
                <si.Icon
                  size={isActive ? 15 : 10}
                  stroke={2}
                  className={task.status === "running" ? "animate-spin" : ""}
                />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-semibold leading-none ${isActive ? "text-[10px]" : "text-[9px]"}`}
                    style={{ color: "#1A1A2E", fontFamily: "SF Pro Text, system-ui, sans-serif" }}
                  >
                    {task.task}
                  </span>
                  <span className={`text-[7px] font-mono uppercase tracking-wide rounded px-1 py-0.5 ${si.bg} ${si.color}`}>
                    {task.status}
                  </span>
                </div>
                {isActive && (
                  <p className="text-[9px] truncate mt-0.5 leading-tight" style={{ color: "#737373" }}>
                    {task.action}
                  </p>
                )}
              </div>

              {isActive && (
                <span className="text-[9px] font-mono shrink-0" style={{ color: "#9ca3af" }}>
                  {task.t}
                </span>
              )}
            </div>
          </motion.div>
        )
      })}

      {/* Progress dots */}
      <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
        {COMPLIANCE_TASKS.map((_, i) => (
          <motion.div
            key={i}
            className="rounded-full"
            style={{ background: "#1A1A2E", height: 3 }}
            animate={{ width: i === activeIdx ? 14 : 4, opacity: i === activeIdx ? 0.45 : 0.12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Card 4 – Document Vault
   Namespaces + retrieval log
   ───────────────────────────────────────────── */

const DOC_NS_CONFIG: Record<string, {
  Icon: TablerIconComponent
  barClass: string
  dotClass: string
  badgeClass: string
  activeGrad: string
  activeBorder: string
}> = {
  Registration: {
    Icon: IconBuildingBank,
    barClass: "from-[#C9A227] to-[#a88520]",
    dotClass: "bg-[#C9A227]",
    badgeClass: "bg-amber-500/15 text-amber-700",
    activeGrad: "linear-gradient(to bottom, #C9A227, #a88520)",
    activeBorder: "#a88520",
  },
  Tax: {
    Icon: IconFileInvoice,
    barClass: "from-slate-600 to-slate-800",
    dotClass: "bg-slate-600",
    badgeClass: "bg-slate-500/15 text-slate-700",
    activeGrad: "linear-gradient(to bottom, #1A1A2E, #0d0d1a)",
    activeBorder: "#0d0d1a",
  },
  Corporate: {
    Icon: IconBriefcase,
    barClass: "from-emerald-400 to-emerald-600",
    dotClass: "bg-emerald-500",
    badgeClass: "bg-emerald-500/15 text-emerald-700",
    activeGrad: "linear-gradient(to bottom, #34d399, #059669)",
    activeBorder: "#047857",
  },
  Legal: {
    Icon: IconGavel,
    barClass: "from-violet-400 to-violet-600",
    dotClass: "bg-violet-500",
    badgeClass: "bg-violet-500/15 text-violet-700",
    activeGrad: "linear-gradient(to bottom, #a78bfa, #7c3aed)",
    activeBorder: "#6d28d9",
  },
}

const VAULT_NAMESPACES = [
  { name: "Registration", hits: 24, fill: 88 },
  { name: "Tax",          hits: 18, fill: 66 },
  { name: "Corporate",    hits: 11, fill: 40 },
  { name: "Legal",        hits: 6,  fill: 20 },
]

const VAULT_QUERIES = [
  { ns: "Registration", q: "Certificate of Incorporation 2024", t: "just now" },
  { ns: "Tax",          q: "KRA PIN certificate",               t: "2m ago"   },
  { ns: "Registration", q: "CR12 company search result",        t: "8m ago"   },
  { ns: "Corporate",    q: "Board resolution — Q1 2025",        t: "1h ago"   },
  { ns: "Legal",        q: "Legal audit report March 2025",     t: "3h ago"   },
  { ns: "Tax",          q: "Annual returns confirmation",       t: "5h ago"   },
]

function Card4() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const iv = setInterval(() => setTick((p) => (p + 1) % VAULT_QUERIES.length), 2000)
    return () => clearInterval(iv)
  }, [])

  const activeNs = VAULT_QUERIES[tick].ns
  const recentQueries = [0, 1, 2, 3].map(
    (offset) => VAULT_QUERIES[(tick - offset + VAULT_QUERIES.length) % VAULT_QUERIES.length]
  )

  return (
    <div className="w-full h-full flex gap-4 py-2 px-3">
      {/* Left – Namespace bars */}
      <div className="flex-1 flex flex-col min-w-0">
        <p className="text-[8px] font-mono uppercase tracking-widest mb-3" style={{ color: "#9ca3af" }}>
          Document Vault
        </p>
        <div className="flex flex-col gap-3 flex-1">
          {VAULT_NAMESPACES.map((ns, i) => {
            const c = DOC_NS_CONFIG[ns.name]
            const isActive = ns.name === activeNs

            return (
              <div key={ns.name} className="flex items-center gap-3">
                {/* Icon container */}
                <div
                  className="relative flex shrink-0 items-center justify-center w-[34px] h-[34px] rounded-[10px] border transition-all duration-500"
                  style={{
                    background: isActive ? c.activeGrad : "#fff",
                    borderColor: isActive ? c.activeBorder : "rgba(0,0,0,0.08)",
                    color: isActive ? "#fff" : "#9ca3af",
                    transform: isActive ? "scale(1.06)" : "scale(1)",
                    boxShadow: isActive
                      ? "inset 0 0.5px 0 rgba(255,255,255,0.4), 0 2px 6px rgba(0,0,0,0.12)"
                      : "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                >
                  <c.Icon size={15} stroke={1.5} />
                </div>

                {/* Name */}
                <span
                  className="text-[9.5px] font-mono w-16 shrink-0 transition-colors duration-300"
                  style={{ color: isActive ? "#1A1A2E" : "#9ca3af", fontWeight: isActive ? 600 : 400 }}
                >
                  {ns.name}
                </span>

                {/* Bar */}
                <div className="flex-1 h-1.5 rounded-full overflow-hidden relative" style={{ background: "rgba(0,0,0,0.06)" }}>
                  <motion.div
                    className={`absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r ${c.barClass}`}
                    initial={{ width: "0%" }}
                    animate={{ width: `${ns.fill}%`, opacity: isActive ? 1 : 0.22 }}
                    transition={{ width: { duration: 1.2, delay: i * 0.1, type: "spring", bounce: 0.2 }, opacity: { duration: 0.4 } }}
                  >
                    {isActive && (
                      <motion.div
                        className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/50 to-transparent"
                        initial={{ x: "-100%" }} animate={{ x: "100%" }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      />
                    )}
                  </motion.div>
                </div>

                {/* Count */}
                <div className={`flex items-center gap-1 w-7 justify-end transition-all duration-500 ${isActive ? "opacity-100" : "opacity-40"}`}>
                  <span className="text-[9px] font-mono font-medium" style={{ color: isActive ? "#1A1A2E" : "#9ca3af" }}>
                    {ns.hits}
                  </span>
                  {isActive && (
                    <motion.div
                      className={`w-1 h-1 rounded-full ${c.dotClass}`}
                      animate={{ opacity: [1, 0.2, 1], scale: [1, 1.6, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Live sync indicator */}
        <div className="flex items-center gap-2 pt-3 mt-auto">
          <div className="relative flex items-center justify-center w-2 h-2">
            <motion.div
              className="absolute inset-0 rounded-full bg-emerald-400/40"
              animate={{ scale: [1, 2.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          <span className="text-[7.5px] font-mono font-medium tracking-wide" style={{ color: "#9ca3af" }}>
            Vault synced
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px self-stretch shrink-0" style={{ background: "rgba(0,0,0,0.07)" }} />

      {/* Right – Retrieval log */}
      <div className="w-[158px] shrink-0 flex flex-col">
        <p className="text-[8px] font-mono uppercase tracking-widest mb-2.5" style={{ color: "#9ca3af" }}>
          Recent Activity
        </p>
        <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
          {recentQueries.map((q, qi) => {
            const c = DOC_NS_CONFIG[q.ns]
            return (
              <motion.div
                key={`${q.ns}-${q.q}-${qi}`}
                className="rounded-xl border px-2.5 py-2"
                style={{
                  borderColor: "rgba(0,0,0,0.07)",
                  background: qi === 0 ? "#fff" : "rgba(255,255,255,0.35)",
                }}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: qi === 0 ? 1 : qi === 1 ? 0.72 : qi === 2 ? 0.42 : 0.18, y: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 35, delay: qi * 0.05 }}
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className={`text-[6.5px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded-md ${c.badgeClass}`}>
                    {q.ns}
                  </span>
                  <span className="text-[7px] font-mono ml-auto tabular-nums" style={{ color: "#d1d5db" }}>
                    {q.t}
                  </span>
                </div>
                <p className="text-[8px] font-mono truncate leading-tight" style={{ color: "#374151" }}>
                  {q.q}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Card 5 – Service Pillars
   Entity Formation / Corporate / Legal Audit / Annual
   ───────────────────────────────────────────── */

const SERVICES = [
  { name: "Entity Formation",   count: 89, label: "registrations", Icon: IconBuildingBank, grad: "from-[#C9A227] to-[#a88520]",       border: "border-[#a88520]" },
  { name: "Corporate Services", count: 64, label: "active",        Icon: IconBriefcase,    grad: "from-slate-600 to-slate-800",        border: "border-slate-800" },
  { name: "Legal Audit",        count: 31, label: "completed",     Icon: IconGavel,        grad: "from-emerald-400 to-emerald-600",    border: "border-emerald-600" },
  { name: "Annual Returns",     count: 45, label: "filed",         Icon: IconFileText,     grad: "from-violet-400 to-violet-600",      border: "border-violet-600" },
]

function Card5() {
  const max = Math.max(...SERVICES.map((s) => s.count))

  return (
    <div className="w-full h-full flex items-center justify-center p-1">
      <div className="grid grid-cols-2 gap-2 w-full">
        {SERVICES.map((s, i) => (
          <motion.div
            key={i}
            className="relative rounded-[16px] border bg-white flex flex-col justify-between p-2.5"
            style={{
              borderColor: "rgba(0,0,0,0.08)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 25 }}
            whileHover={{
              y: -1,
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              borderColor: "rgba(0,0,0,0.14)",
            }}
          >
            {/* Icon + count */}
            <div className="flex items-start justify-between">
              <div
                className={`w-[26px] h-[26px] rounded-[7px] flex items-center justify-center text-white bg-gradient-to-b ${s.grad} border ${s.border}`}
                style={{ boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.5), 0 1px 3px rgba(0,0,0,0.12)" }}
              >
                <s.Icon size={13} stroke={1.5} />
              </div>
              <div className="flex flex-col items-end gap-0.5 mt-0.5">
                <span className="text-[12px] font-mono font-bold leading-none" style={{ color: "#1A1A2E" }}>
                  {s.count}
                </span>
                <span className="text-[6.5px] font-mono uppercase tracking-widest leading-none" style={{ color: "#9ca3af" }}>
                  {s.label}
                </span>
              </div>
            </div>

            {/* Name + bar */}
            <div className="mt-2 flex flex-col gap-1.5">
              <span className="text-[8.5px] font-medium leading-tight" style={{ color: "#1A1A2E", fontFamily: "SF Pro Text, system-ui, sans-serif" }}>
                {s.name}
              </span>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${s.grad}`}
                  initial={{ width: "0%" }}
                  animate={{ width: `${(s.count / max) * 100}%` }}
                  transition={{ delay: 0.4 + i * 0.1, duration: 0.9, ease: "easeOut" }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main Grid + Section Export
   ───────────────────────────────────────────── */

const CARDS = [
  {
    title: "Registration Pipeline",
    description: "Documents flow from upload through OCR scanning to BRS filing and your compliance dashboard.",
    visual: <Card1 />,
    colSpan: "lg:col-span-1",
    height: "h-[280px]",
    delay: 0,
  },
  {
    title: "Compliance Score",
    description: "Track your readiness score and weekly filing activity across every regulatory obligation.",
    visual: <Card2 />,
    colSpan: "lg:col-span-1",
    height: "h-[280px]",
    delay: 0.05,
  },
  {
    title: "Task Checklist",
    description: "Real-time feed of every regulatory task — BRS, KRA, NSSF, and beyond — in one view.",
    visual: <Card3 />,
    colSpan: "lg:col-span-1",
    height: "h-[280px]",
    delay: 0.1,
  },
  {
    title: "Document Vault",
    description: "Incorporation, tax, corporate, and legal documents — all stored, searchable, and audit-ready.",
    visual: <Card4 />,
    colSpan: "lg:col-span-2",
    height: "h-[280px]",
    delay: 0.15,
  },
  {
    title: "Service Pillars",
    description: "Entity formation, corporate governance, legal audit — built for Kenyan businesses.",
    visual: <Card5 />,
    colSpan: "lg:col-span-1",
    height: "h-[280px]",
    delay: 0.2,
  },
]


export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative">
      {/* Gold label — scrolls away above the reveal zone */}
      <div className="px-4 pt-20 pb-0 text-center">
        <p
          className="text-xs font-semibold uppercase tracking-[0.15em]"
          style={{ color: "#C9A227", fontFamily: "SF Pro Text, system-ui, sans-serif" }}
        >
          How it works
        </p>
      </div>

      {/* Scroll-driven word reveal for the main headline */}
      <TextReveal
        textClassName="!font-semibold tracking-tight"
        style={{
          fontFamily: "SF Pro Display, system-ui, sans-serif",
          letterSpacing: "-0.8px",
        }}
      >
        From idea to fully compliant entity.
      </TextReveal>

      {/* Subtitle + bento grid */}
      <div className="px-4 pb-20">
        <div className="mx-auto max-w-5xl">
          <p
            className="mx-auto mb-12 max-w-md text-center"
            style={{
              color: "#737373",
              fontSize: "clamp(14px, 1.5vw, 16px)",
              lineHeight: 1.6,
              fontFamily: "SF Pro Text, system-ui, sans-serif",
            }}
          >
            Three onboarding paths. One unified platform. Complete compliance from day one.
          </p>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 w-full">
          {CARDS.map((card, idx) => (
            <FeatCard
              key={idx}
              title={card.title}
              description={card.description}
              className={cn(card.colSpan, card.height)}
              delay={card.delay}
            >
              {card.visual}
            </FeatCard>
          ))}
          </div>

        </div>
      </div>
    </section>
  )
}
