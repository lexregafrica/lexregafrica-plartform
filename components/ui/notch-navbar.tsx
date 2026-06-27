"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { IconMenu2, IconX } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { ShimmerButton } from "@/components/ui/shimmer-button"

const NAV_LEFT = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Services",     href: "#services"     },
  { label: "Pricing",      href: "#pricing"      },
]

// Shared background + blur applied to every surface of the notch
const SURFACE = "rgba(255,255,255,0.88)"
const SURFACE_STYLE = {
  background: SURFACE,
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
} as const

export function NotchNavbar({ className }: { className?: string }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <header
        className={cn("fixed top-0 inset-x-0 z-[5000] flex h-16 items-start", className)}
      >
        {/* ── Left wing bar ─────────────────────────────── */}
        <div
          className="relative h-10 flex-1 min-w-0"
          style={SURFACE_STYLE}
        >
          <svg className="absolute inset-0 h-full w-full pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="39.5" x2="100%" y2="39.5" stroke="rgba(0,0,0,0.06)" strokeWidth="0.75" />
          </svg>
        </div>

        {/* ── Notch ─────────────────────────────────────── */}
        <div className="relative z-10 flex h-16 shrink-0 -ml-px">

          {/* Left corner — curves wing (y=40) down into notch (y=64) */}
          <div className="relative h-full w-[50px] shrink-0">
            <div
              className="absolute inset-0"
              style={{
                ...SURFACE_STYLE,
                clipPath: "path('M0 0 H50 V64 C25 64 25 40 0 40 Z')",
              }}
            />
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 50 64">
              <path d="M0 39.5 C25 39.5 25 63.5 50 63.5" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.75" />
            </svg>
          </div>

          {/* Center notch body */}
          <div className="relative -ml-px flex-1 h-full min-w-0" style={{ minWidth: "min(580px, 78vw)" }}>
            {/* Background */}
            <div className="absolute inset-0" style={SURFACE_STYLE}>
              <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
                <line x1="0" y1="63.5" x2="100%" y2="63.5" stroke="rgba(0,0,0,0.06)" strokeWidth="0.75" />
              </svg>
            </div>

            {/* Content */}
            <div className="relative flex h-full w-full items-end justify-between pb-2 px-5 md:px-8">

              {/* Desktop left nav */}
              <nav className="mb-1 hidden items-center gap-6 md:flex">
                {NAV_LEFT.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault()
                      document.querySelector(item.href)?.scrollIntoView({ behavior: "smooth" })
                    }}
                    className="whitespace-nowrap text-[13px] font-medium transition-colors duration-150"
                    style={{
                      color: "#737373",
                      fontFamily: "SF Pro Text, system-ui, sans-serif",
                      letterSpacing: "-0.12px",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#1A1A2E")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#737373")}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>

              {/* Mobile hamburger */}
              <button
                className="mb-1 md:hidden p-1 transition-colors"
                style={{ color: "#737373" }}
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Toggle menu"
              >
                {menuOpen
                  ? <IconX size={20} stroke={1.5} />
                  : <IconMenu2 size={20} stroke={1.5} />
                }
              </button>

              {/* Desktop right CTAs */}
              <div className="mb-1 hidden items-center gap-1 md:flex">
                <Link
                  href="/login"
                  className="rounded-full px-3 py-1.5 text-[13px] font-medium transition-opacity hover:opacity-60"
                  style={{
                    color: "#1A1A2E",
                    fontFamily: "SF Pro Text, system-ui, sans-serif",
                    letterSpacing: "-0.12px",
                  }}
                >
                  Sign in
                </Link>
                <Link href="/signup">
                  <ShimmerButton
                    background="#1A1A2E"
                    shimmerColor="#C9A227"
                    shimmerDuration="2.5s"
                    className="px-4 py-[6px] text-[13px] font-medium tracking-[-0.12px]"
                    style={{ fontFamily: "SF Pro Text, system-ui, sans-serif" }}
                  >
                    Get started
                  </ShimmerButton>
                </Link>
              </div>

              {/* Mobile: just Get started */}
              <div className="mb-1 flex items-center md:hidden">
                <Link href="/signup">
                  <ShimmerButton
                    background="#1A1A2E"
                    shimmerColor="#C9A227"
                    shimmerDuration="2.5s"
                    className="px-3 py-[5px] text-[12px] font-medium tracking-[-0.12px]"
                    style={{ fontFamily: "SF Pro Text, system-ui, sans-serif" }}
                  >
                    Get started
                  </ShimmerButton>
                </Link>
              </div>

            </div>
          </div>

          {/* Right corner — curves notch (y=64) back up to wing (y=40) */}
          <div className="relative h-full w-[50px] shrink-0 -ml-px">
            <div
              className="absolute inset-0"
              style={{
                ...SURFACE_STYLE,
                clipPath: "path('M0 0 H50 V40 C25 40 25 64 0 64 Z')",
              }}
            />
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 50 64">
              <path d="M0 63.5 C25 63.5 25 39.5 50 39.5" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.75" />
            </svg>
          </div>

        </div>

        {/* ── Right wing bar ────────────────────────────── */}
        <div
          className="relative h-10 flex-1 min-w-0 -ml-px"
          style={SURFACE_STYLE}
        >
          <svg className="absolute inset-0 h-full w-full pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="39.5" x2="100%" y2="39.5" stroke="rgba(0,0,0,0.06)" strokeWidth="0.75" />
          </svg>
        </div>
      </header>

      {/* ── Mobile dropdown ───────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 top-16 z-[4999] px-4 md:hidden"
          >
            <div
              className="rounded-2xl p-4 shadow-lg"
              style={{
                background: "rgba(255,255,255,0.96)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(0,0,0,0.07)",
              }}
            >
              <nav className="flex flex-col gap-1">
                {NAV_LEFT.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault()
                      setMenuOpen(false)
                      setTimeout(() => {
                        document.querySelector(item.href)?.scrollIntoView({ behavior: "smooth" })
                      }, 120)
                    }}
                    className="flex items-center rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors"
                    style={{ color: "#1A1A2E", fontFamily: "SF Pro Text, system-ui, sans-serif" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {item.label}
                  </a>
                ))}
                <div className="my-2 h-px" style={{ background: "rgba(0,0,0,0.07)" }} />
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors"
                  style={{ color: "#737373", fontFamily: "SF Pro Text, system-ui, sans-serif" }}
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="mt-1 flex items-center justify-center rounded-xl px-3 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: "#1A1A2E", fontFamily: "SF Pro Text, system-ui, sans-serif" }}
                >
                  Get started
                </Link>
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
