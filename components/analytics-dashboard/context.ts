"use client";

import { createContext, useContext } from "react";
import type { AnalyticsDashboardData, AnalyticsPerson, AnalyticsPullRequest } from "./data";

export type AnalyticsDashboardPage = "overview" | "repositories" | "reviews" | "settings";

export type AnalyticsDashboardAccent = "burgundy" | "gold" | "navy" | "blue";

export const ACCENTS: Record<AnalyticsDashboardAccent, { label: string; ui: string }> = {
  burgundy: { label: "Burgundy", ui: "#800020" },
  gold: { label: "Gold", ui: "#C9A227" },
  navy: { label: "Navy", ui: "#1A1A2E" },
  blue: { label: "Blue", ui: "#4c9bff" },
};

export type AnalyticsDashboardUser = {
  name: string;
  email: string;
  avatar: string;
  role?: string;
};

export type AnswerHandler = (question: string, pullRequest: AnalyticsPullRequest) => string | Promise<string>;

type DashboardState = {
  data: AnalyticsDashboardData;
  person: (handle: string) => AnalyticsPerson | undefined;
  user: AnalyticsDashboardUser;
  assistantName: string;
  answer?: AnswerHandler;
  /** Prefix for element ids, unique per dashboard instance. */
  uid: string;
  selected: number;
  openPr: (prNumber: number) => void;
  navigate: (page: AnalyticsDashboardPage) => void;
  accent: AnalyticsDashboardAccent;
  setAccent: (accent: AnalyticsDashboardAccent) => void;
};

export const DashboardContext = createContext<DashboardState | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside <AnalyticsDashboard>");
  return ctx;
}
