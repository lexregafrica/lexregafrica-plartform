"use client"

import {
  useRef,
  type ComponentPropsWithoutRef,
  type FC,
  type ReactNode,
} from "react"
import { motion, MotionValue, useScroll, useTransform } from "motion/react"

import { cn } from "@/lib/utils"

export interface TextRevealProps extends ComponentPropsWithoutRef<"div"> {
  children: string
  /** Extra classes applied to the words container (use to override size/font) */
  textClassName?: string
  /** Class for the revealed (fully opaque) word — default navy */
  revealClassName?: string
}

export const TextReveal: FC<TextRevealProps> = ({ children, className, textClassName, revealClassName }) => {
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
  })

  if (typeof children !== "string") {
    throw new Error("TextReveal: children must be a string")
  }

  const words = children.split(" ")

  return (
    <div ref={sectionRef} className={cn("relative z-0 h-[200vh]", className)}>
      <div
        className={
          "sticky top-0 mx-auto flex h-[50%] max-w-4xl items-center bg-transparent px-4 py-20"
        }
      >
        <span
          className={cn(
            "flex flex-wrap p-5 text-2xl font-bold text-[#1A1A2E]/20 md:p-8 md:text-3xl lg:p-10 lg:text-4xl xl:text-5xl",
            textClassName
          )}
        >
          {words.map((word, i) => {
            const start = i / words.length
            const end = start + 1 / words.length
            return (
              <Word key={i} progress={scrollYProgress} range={[start, end]} revealClassName={revealClassName}>
                {word}
              </Word>
            )
          })}
        </span>
      </div>
    </div>
  )
}

interface WordProps {
  children: ReactNode
  progress: MotionValue<number>
  range: [number, number]
  revealClassName?: string
}

const Word: FC<WordProps> = ({ children, progress, range, revealClassName }) => {
  const opacity = useTransform(progress, range, [0, 1])
  return (
    <span className="xl:lg-3 relative mx-1 lg:mx-1.5">
      <span className="absolute opacity-30">{children}</span>
      <motion.span
        style={{ opacity }}
        className={cn("text-[#1A1A2E]", revealClassName)}
      >
        {children}
      </motion.span>
    </span>
  )
}
