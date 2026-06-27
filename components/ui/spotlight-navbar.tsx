"use client";

import React, { useEffect, useRef, useState } from "react";
import { animate } from "motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { LexRegLogoMark } from "@/components/ui/lexreg-logo";

export interface NavItem {
  label: string;
  href: string;
}

export interface SpotlightNavbarProps {
  items?: NavItem[];
  className?: string;
  defaultActiveIndex?: number;
}

export function SpotlightNavbar({
  items = [],
  className,
  defaultActiveIndex = 0,
}: SpotlightNavbarProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const spotlightX = useRef(0);
  const ambienceX = useRef(0);

  // Track mouse position over the pill
  useEffect(() => {
    if (!navRef.current) return;
    const nav = navRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = nav.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setHoverX(x);
      spotlightX.current = x;
      nav.style.setProperty("--spotlight-x", `${x}px`);
    };

    const handleMouseLeave = () => {
      setHoverX(null);
      const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`);
      if (activeItem) {
        const navRect = nav.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        const targetX = itemRect.left - navRect.left + itemRect.width / 2;
        animate(spotlightX.current, targetX, {
          type: "spring",
          stiffness: 200,
          damping: 20,
          onUpdate: (v) => {
            spotlightX.current = v;
            nav.style.setProperty("--spotlight-x", `${v}px`);
          },
        });
      }
    };

    nav.addEventListener("mousemove", handleMouseMove);
    nav.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      nav.removeEventListener("mousemove", handleMouseMove);
      nav.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [activeIndex]);

  // Spring-animate the gold ambience to the active item
  useEffect(() => {
    if (!navRef.current) return;
    const nav = navRef.current;
    const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`);
    if (activeItem) {
      const navRect = nav.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();
      const targetX = itemRect.left - navRect.left + itemRect.width / 2;
      animate(ambienceX.current, targetX, {
        type: "spring",
        stiffness: 200,
        damping: 20,
        onUpdate: (v) => {
          ambienceX.current = v;
          nav.style.setProperty("--ambience-x", `${v}px`);
        },
      });
    }
  }, [activeIndex]);

  return (
    <div
      className={cn(
        "fixed inset-x-0 top-0 z-[5000] flex items-center justify-between px-5 sm:px-8",
        className
      )}
      style={{ height: "60px" }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="flex select-none items-center gap-2 shrink-0 transition-opacity hover:opacity-70"
      >
        <LexRegLogoMark size={30} africaColor="#1A1A2E" swooshColor="#C9A227" />
        <span
          className="hidden sm:block"
          style={{
            color: "#1A1A2E",
            fontSize: "13px",
            fontWeight: 600,
            letterSpacing: "-0.3px",
            fontFamily: "SF Pro Text, var(--font-geist-sans), system-ui, sans-serif",
          }}
        >
          LexReg Africa
        </span>
      </Link>

      {/* Spotlight nav pill */}
      <nav
        ref={navRef}
        className="relative h-10 rounded-full overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <ul className="relative flex items-center h-full px-1.5 z-10">
          {items.map((item, idx) => (
            <li key={idx} className="relative h-full flex items-center">
              <a
                href={item.href}
                data-index={idx}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveIndex(idx);
                  const target = document.querySelector(item.href);
                  if (target) target.scrollIntoView({ behavior: "smooth" });
                }}
                className={cn(
                  "px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors duration-200",
                  "focus-visible:outline-none",
                  activeIndex === idx
                    ? "text-[#1A1A2E]"
                    : "text-neutral-400 hover:text-[#1A1A2E]"
                )}
                style={{
                  fontFamily: "SF Pro Text, var(--font-geist-sans), system-ui, sans-serif",
                  letterSpacing: "-0.12px",
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Spotlight — follows mouse */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 w-full h-full z-[1] transition-opacity duration-300"
          style={{
            opacity: hoverX !== null ? 1 : 0,
            background: `radial-gradient(110px circle at var(--spotlight-x) 100%, rgba(201,162,39,0.13) 0%, transparent 50%)`,
          }}
        />

        {/* Ambience — gold dot under active item */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 w-full h-[2px] z-[2]"
          style={{
            background: `radial-gradient(50px circle at var(--ambience-x) 0%, #C9A227 0%, transparent 100%)`,
          }}
        />
      </nav>

      {/* CTAs */}
      <div className="flex items-center gap-1 shrink-0">
        <Link
          href="/login"
          className="hidden sm:block rounded-full px-3 py-1.5 transition-opacity hover:opacity-60"
          style={{
            color: "#1A1A2E",
            fontSize: "13px",
            fontWeight: 400,
            letterSpacing: "-0.12px",
            fontFamily: "SF Pro Text, var(--font-geist-sans), system-ui, sans-serif",
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
            style={{ fontFamily: "SF Pro Text, var(--font-geist-sans), system-ui, sans-serif" }}
          >
            Get started
          </ShimmerButton>
        </Link>
      </div>
    </div>
  );
}
