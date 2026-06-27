"use client";

import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { TextAnimate } from "@/components/ui/text-animate";
import type { GlobeConfig } from "@/components/ui/globe";

const World = dynamic(
  () => import("@/components/ui/globe").then((m) => m.World),
  { ssr: false },
);

const GOLD = "#C9A227";
const GOLD_LIGHT = "#E8C35A";
const GOLD_PALE = "#F5DFA0";

const globeConfig: GlobeConfig = {
  globeColor: "#111827",
  emissive: "#0a0a14",
  emissiveIntensity: 0.12,
  shininess: 0.7,
  showAtmosphere: true,
  atmosphereColor: "#C9A227",
  atmosphereAltitude: 0.08,
  polygonColor: "rgba(255,255,255,0.18)",
  ambientLight: "#38bdf8",
  directionalLeftLight: "#ffffff",
  directionalTopLight: "#ffffff",
  pointLight: "#C9A227",
  arcTime: 1400,
  arcLength: 0.88,
  rings: 1,
  maxRings: 3,
  pointSize: 3,
  autoRotate: true,
  autoRotateSpeed: 0.4,
  initialPosition: { lat: -1.2921, lng: 36.8219 },
};

const ARCS = [
  // East Africa cluster
  { order: 1,  startLat: -1.2921,  startLng: 36.8219,  endLat: -6.7924,  endLng: 39.2083,  arcAlt: 0.08, color: GOLD },
  { order: 1,  startLat: -1.2921,  startLng: 36.8219,  endLat: -1.9441,  endLng: 30.0619,  arcAlt: 0.08, color: GOLD_LIGHT },
  { order: 2,  startLat: -1.2921,  startLng: 36.8219,  endLat: 0.3476,   endLng: 32.5825,  arcAlt: 0.07, color: GOLD },
  // Wider Africa
  { order: 3,  startLat: -1.2921,  startLng: 36.8219,  endLat: -26.2041, endLng: 28.0473,  arcAlt: 0.28, color: GOLD_LIGHT },
  { order: 3,  startLat: -1.2921,  startLng: 36.8219,  endLat: 6.5244,   endLng: 3.3792,   arcAlt: 0.35, color: GOLD },
  { order: 4,  startLat: -1.2921,  startLng: 36.8219,  endLat: 30.0444,  endLng: 31.2357,  arcAlt: 0.22, color: GOLD_PALE },
  // Middle East & Asia
  { order: 5,  startLat: -1.2921,  startLng: 36.8219,  endLat: 25.2048,  endLng: 55.2708,  arcAlt: 0.3,  color: GOLD },
  { order: 5,  startLat: -1.2921,  startLng: 36.8219,  endLat: 19.0760,  endLng: 72.8777,  arcAlt: 0.4,  color: GOLD_LIGHT },
  { order: 6,  startLat: -1.2921,  startLng: 36.8219,  endLat: 1.3521,   endLng: 103.8198, arcAlt: 0.5,  color: GOLD_PALE },
  // Europe
  { order: 7,  startLat: -1.2921,  startLng: 36.8219,  endLat: 51.5072,  endLng: -0.1276,  arcAlt: 0.45, color: GOLD },
  { order: 7,  startLat: -1.2921,  startLng: 36.8219,  endLat: 50.1109,  endLng: 8.6821,   arcAlt: 0.42, color: GOLD_LIGHT },
  { order: 8,  startLat: -1.2921,  startLng: 36.8219,  endLat: 48.8566,  endLng: 2.3522,   arcAlt: 0.44, color: GOLD_PALE },
  // Americas
  { order: 9,  startLat: -1.2921,  startLng: 36.8219,  endLat: 40.7128,  endLng: -74.0060, arcAlt: 0.6,  color: GOLD },
  { order: 10, startLat: -1.2921,  startLng: 36.8219,  endLat: 43.6532,  endLng: -79.3832, arcAlt: 0.62, color: GOLD_LIGHT },
];

export function GlobeSection() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="relative mx-auto max-w-5xl px-4">
        {/* Heading */}
        <div className="text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-4 text-xs font-semibold uppercase tracking-[0.15em]"
            style={{ color: GOLD, fontFamily: "SF Pro Text, system-ui, sans-serif" }}
          >
            Global standards, local expertise
          </motion.p>

          <TextAnimate
            as="h2"
            animation="blurInUp"
            by="word"
            delay={0.1}
            duration={0.6}
            startOnView
            className="mx-auto max-w-2xl"
            style={{
              fontFamily: "SF Pro Display, system-ui, sans-serif",
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 700,
              color: "#1A1A2E",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
            }}
          >
            Compliance trusted beyond Kenya&apos;s borders
          </TextAnimate>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
            className="mx-auto mt-4 max-w-lg"
            style={{
              color: "#737373",
              fontSize: "15px",
              lineHeight: 1.65,
              fontFamily: "SF Pro Text, system-ui, sans-serif",
            }}
          >
            LexReg connects Kenyan businesses to the regulatory frameworks that
            global partners, investors, and institutions expect.
          </motion.p>
        </div>

        {/* Globe — no background, floats freely */}
        <div className="relative mt-6 h-[420px] md:h-[540px]">
          <World data={ARCS} globeConfig={globeConfig} />
        </div>
      </div>
    </section>
  );
}
