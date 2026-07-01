"use client";
import React, { useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "motion/react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ShimmerButton } from "@/components/ui/shimmer-button";

export const FloatingNav = ({
  navItems,
  className,
}: {
  navItems: {
    name: string;
    link: string;
    icon?: React.ReactNode;
  }[];
  className?: string;
}) => {
  const { scrollYProgress } = useScroll();
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (typeof current === "number") {
      const direction = current - scrollYProgress.getPrevious()!;
      if (scrollYProgress.get() < 0.05) {
        setVisible(false);
      } else {
        if (direction < 0) {
          setVisible(true);
        } else {
          setVisible(false);
        }
      }
    }
  });

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ y: visible ? 0 : -20, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed left-1/2 top-6 z-[5000] -translate-x-1/2",
          className
        )}
      >
        <div className="flex items-center gap-1 rounded-full border border-black/8 bg-white/85 px-2 py-1.5 shadow-lg shadow-black/8 backdrop-blur-xl">

          {/* Logo */}
          <Link
            href="/"
            className="flex select-none items-center gap-1.5 rounded-full px-3 py-1.5 transition-opacity hover:opacity-70"
          >
            <img
              src="/images/logo.png"
              alt="LexReg Africa"
              className="h-6 w-6 object-contain"
            />
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

          {/* Divider */}
          <div className="h-4 w-px bg-black/10" />

          {/* Nav links */}
          <div className="flex items-center">
            {navItems.map((navItem, idx) => (
              <a
                key={`link-${idx}`}
                href={navItem.link}
                className="flex items-center gap-1 rounded-full px-3 py-1.5 transition-colors hover:bg-black/5"
                style={{
                  color: "#333333",
                  fontSize: "13px",
                  fontWeight: 400,
                  letterSpacing: "-0.12px",
                  fontFamily: "SF Pro Text, var(--font-geist-sans), system-ui, sans-serif",
                }}
              >
                <span className="block sm:hidden">{navItem.icon}</span>
                <span className="hidden sm:block">{navItem.name}</span>
              </a>
            ))}
          </div>

          {/* Divider */}
          <div className="h-4 w-px bg-black/10" />

          {/* CTAs */}
          <Link
            href="/login"
            className="hidden rounded-full px-3 py-1.5 transition-opacity hover:opacity-60 sm:block"
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
      </motion.div>
    </AnimatePresence>
  );
};
