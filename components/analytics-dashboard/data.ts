export type AnalyticsPerson = {
  /** Unique handle. Pull requests and activity series refer to people by it. */
  handle: string;
  /** Avatar image URL. */
  avatar: string;
  /** Any CSS color. Used for the chart segments, legend and share bars. */
  color: string;
  role: string;
};

export type AnalyticsRange = { id: string; label: string; caption: string };

export type AnalyticsKpiIcon = "commit" | "pull" | "merge" | "clock";

export type AnalyticsKpi = {
  id: string;
  label: string;
  icon: AnalyticsKpiIcon;
  /** Displayed as is, so it can carry a unit such as "3.4h". */
  value: string;
  /** Percent change against the previous period. */
  delta: number;
  /** For metrics like review time, going down is the good direction. */
  lowerIsBetter?: boolean;
  spark: number[];
};

export type AnalyticsActivity = {
  labels: string[];
  /** Commits per label, keyed by person handle. */
  series: Record<string, number[]>;
  lines: Record<string, { added: number; removed: number }>;
};

export type AnalyticsRepository = {
  name: string;
  description: string;
  language: string;
  languageColor: string;
  visibility: "Private" | "Public";
  openPrs: number;
  stars: number;
  updated: string;
  /** Minutes since the last push, used for sorting. */
  updatedMinutes: number;
  /** Commits per day, oldest first. */
  activity: number[];
  /** LexReg: link to the entity workspace. */
  href?: string;
};

export type AnalyticsPrStatus = { kind: "merged" | "review" | "open"; label: string };

export type AnalyticsPullRequest = {
  number: number;
  title: string;
  /** Handle of a person in `people`. */
  author: string;
  status: AnalyticsPrStatus;
  repository: string;
  opened: string;
  /** Short relative time used in lists. */
  age: string;
  /** Listed under "Today PRs" on the overview. */
  today: boolean;
  additions: number;
  deletions: number;
  comments: number;
  /** Paragraphs; text wrapped in backticks renders as inline code. */
  problem: string[];
  approach: string[];
};

export type AnalyticsDashboardData = {
  people: AnalyticsPerson[];
  ranges: AnalyticsRange[];
  /** Metric cards per range id. */
  kpis: Record<string, AnalyticsKpi[]>;
  /** Commit activity per range id. */
  activity: Record<string, AnalyticsActivity>;
  repositories: AnalyticsRepository[];
  pullRequests: AnalyticsPullRequest[];
};

/** Initials avatar as an inline SVG, so the mockup loads no remote images. */
function initials(text: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="32" fill="${color}"/><text x="32" y="41" font-family="-apple-system,Segoe UI,sans-serif" font-size="24" font-weight="600" fill="#fff" text-anchor="middle">${text}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// LexReg sample data — mockup only. "Repositories" are entities, "pull
// requests" are matters, "commits" are filings and actions on the record.
export const analyticsDashboardDemoData: AnalyticsDashboardData = {
  people: [
    { handle: "Charles", avatar: initials("CM", "#800020"), color: "#800020", role: "LexReg · Super admin" },
    { handle: "Achieng", avatar: initials("AO", "#C9A227"), color: "#C9A227", role: "Assigned lawyer" },
    { handle: "Wanjiku", avatar: initials("WM", "#1A1A2E"), color: "#1A1A2E", role: "Business owner" },
  ],
  ranges: [
    { id: "today", label: "Today", caption: "Wed, 11 Nov · since 8:00 AM" },
    { id: "week", label: "Week", caption: "9 Nov – 13 Nov 2026" },
    { id: "month", label: "Month", caption: "14 Oct – 11 Nov 2026" },
  ],
  kpis: {
    today: [
      { id: "filings", label: "Filings", icon: "commit", value: "4", delta: 33, spark: [1, 0, 1, 1, 2, 1, 2, 2, 3, 4] },
      { id: "open", label: "Open matters", icon: "pull", value: "7", delta: 17, spark: [4, 4, 5, 5, 5, 6, 6, 6, 7, 7] },
      { id: "done", label: "Completed", icon: "merge", value: "2", delta: 100, spark: [0, 0, 1, 0, 1, 1, 0, 1, 1, 2] },
      { id: "turnaround", label: "Avg. turnaround", icon: "clock", value: "3.2d", delta: -11, lowerIsBetter: true, spark: [4.4, 4.1, 4.2, 3.9, 3.8, 3.6, 3.5, 3.4, 3.3, 3.2] },
    ],
    week: [
      { id: "filings", label: "Filings", icon: "commit", value: "19", delta: 12, spark: [8, 10, 9, 12, 11, 13, 14, 15, 17, 19] },
      { id: "open", label: "Open matters", icon: "pull", value: "11", delta: 10, spark: [7, 8, 8, 9, 9, 10, 10, 10, 11, 11] },
      { id: "done", label: "Completed", icon: "merge", value: "8", delta: 14, spark: [3, 4, 4, 5, 5, 6, 6, 7, 7, 8] },
      { id: "turnaround", label: "Avg. turnaround", icon: "clock", value: "3.6d", delta: -18, lowerIsBetter: true, spark: [5.2, 4.9, 5.0, 4.6, 4.4, 4.3, 4.0, 3.9, 3.7, 3.6] },
    ],
    month: [
      { id: "filings", label: "Filings", icon: "commit", value: "74", delta: 21, spark: [40, 44, 46, 51, 55, 58, 62, 66, 70, 74] },
      { id: "open", label: "Open matters", icon: "pull", value: "23", delta: 9, spark: [16, 17, 18, 18, 19, 20, 21, 21, 22, 23] },
      { id: "done", label: "Completed", icon: "merge", value: "31", delta: 15, spark: [18, 19, 21, 22, 24, 25, 27, 28, 30, 31] },
      { id: "turnaround", label: "Avg. turnaround", icon: "clock", value: "4.1d", delta: -6, lowerIsBetter: true, spark: [4.9, 4.7, 4.8, 4.6, 4.5, 4.4, 4.4, 4.3, 4.2, 4.1] },
    ],
  },
  activity: {
    today: {
      labels: ["8 AM", "10 AM", "12 PM", "2 PM", "4 PM"],
      series: { Charles: [1, 2, 1, 2, 1], Achieng: [1, 1, 2, 1, 0], Wanjiku: [0, 1, 1, 0, 1] },
      lines: { Charles: { added: 9, removed: 3 }, Achieng: { added: 6, removed: 2 }, Wanjiku: { added: 4, removed: 1 } },
    },
    week: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      series: { Charles: [5, 7, 6, 8, 6], Achieng: [3, 5, 3, 6, 4], Wanjiku: [2, 2, 4, 3, 2] },
      lines: { Charles: { added: 41, removed: 12 }, Achieng: { added: 26, removed: 9 }, Wanjiku: { added: 18, removed: 4 } },
    },
    month: {
      labels: ["14 Oct", "21 Oct", "28 Oct", "4 Nov", "11 Nov"],
      series: { Charles: [22, 26, 24, 30, 32], Achieng: [12, 15, 18, 16, 19], Wanjiku: [8, 10, 7, 11, 12] },
      lines: { Charles: { added: 164, removed: 48 }, Achieng: { added: 97, removed: 31 }, Wanjiku: { added: 66, removed: 17 } },
    },
  },
  repositories: [
    {
      name: "PVT-2LU7Q9XB/Amani Logistics Limited",
      description: "Freight and last-mile delivery, Mombasa. Legal audit in progress.",
      language: "Private company",
      languageColor: "#800020",
      visibility: "Private",
      openPrs: 3,
      stars: 23,
      updated: "12m ago",
      updatedMinutes: 12,
      activity: [2, 3, 2, 4, 3, 5, 4, 6, 5, 6, 5, 7, 6, 8],
    },
    {
      name: "LLP-4K8M2PQR/Kilele Partners",
      description: "Advisory partnership, Nairobi. Change of bank signatories pending.",
      language: "LLP",
      languageColor: "#C9A227",
      visibility: "Private",
      openPrs: 2,
      stars: 14,
      updated: "1h ago",
      updatedMinutes: 60,
      activity: [1, 2, 1, 2, 3, 2, 3, 2, 4, 3, 3, 4, 3, 4],
    },
    {
      name: "SOC-77310/Tumaini Welfare Society",
      description: "Registered society, Kisumu. Annual returns and legal audit.",
      language: "Society",
      languageColor: "#1A1A2E",
      visibility: "Private",
      openPrs: 1,
      stars: 11,
      updated: "3h ago",
      updatedMinutes: 180,
      activity: [1, 1, 2, 1, 1, 2, 1, 2, 2, 1, 3, 2, 2, 3],
    },
    {
      name: "PLC-9QX41TZA/Savannah Holdings PLC",
      description: "Holding company, Nairobi. Corporate shareholder of Amani Logistics.",
      language: "Public company",
      languageColor: "#5b6475",
      visibility: "Public",
      openPrs: 1,
      stars: 31,
      updated: "1d ago",
      updatedMinutes: 1440,
      activity: [3, 2, 2, 3, 1, 2, 2, 1, 3, 2, 1, 2, 1, 2],
    },
    {
      name: "BN-55K2Q8/Mwangi Kariuki & Associates",
      description: "Business name, Nakuru. Readiness score 64 / 100.",
      language: "Business name",
      languageColor: "#8a8f98",
      visibility: "Private",
      openPrs: 0,
      stars: 6,
      updated: "6h ago",
      updatedMinutes: 360,
      activity: [0, 1, 0, 1, 1, 0, 1, 1, 2, 1, 1, 2, 1, 2],
    },
  ],
  pullRequests: [
    {
      number: 101,
      title: "Legal audit — Amani Logistics Limited",
      author: "Achieng",
      status: { kind: "review", label: "With lawyer · 2h" },
      repository: "Amani Logistics Limited",
      opened: "9:12 AM, 11 Nov 2026",
      age: "2h",
      today: true,
      additions: 20,
      deletions: 3,
      comments: 6,
      problem: [
        "The company asked for a full legal audit before a bank facility. Three gaps came up in the records: no signed `BOF-1` on file, no `ODPC` registration evidence, and Brian Otieno's KRA PIN differs between the `CR12` and his KRA certificate.",
      ],
      approach: [
        "LexAudit drafted a 15-page report from the record. Adv. Achieng Odhiambo is reviewing each finding before she signs it.",
        "The client sees nothing until the lawyer signs and releases the report.",
      ],
    },
    {
      number: 102,
      title: "Board resolution — change of bank signatories",
      author: "Charles",
      status: { kind: "open", label: "Opened 1h ago" },
      repository: "Kilele Partners",
      opened: "10:40 AM, 11 Nov 2026",
      age: "1h",
      today: true,
      additions: 4,
      deletions: 1,
      comments: 2,
      problem: [
        "The partners want to replace one bank signatory. The bank needs a signed resolution and certified IDs for the new signatory.",
      ],
      approach: [
        "LexReg drafts the resolution from the partner register, collects e-signatures from both partners, and certifies the ID copies.",
      ],
    },
    {
      number: 103,
      title: "Annual return 2026 — BRS filing",
      author: "Wanjiku",
      status: { kind: "merged", label: "Filed 3h ago" },
      repository: "Amani Logistics Limited",
      opened: "8:05 AM, 11 Nov 2026",
      age: "3h",
      today: true,
      additions: 5,
      deletions: 0,
      comments: 1,
      problem: ["The 2026 annual return was due on 15 November. Late filing attracts a penalty from the Registrar."],
      approach: [
        "LexReg prepared the return from the register. Wanjiku filed it on BRS eCitizen and uploaded the acknowledgement, which is now in the vault.",
      ],
    },
    {
      number: 104,
      title: "Legal audit — Tumaini Welfare Society",
      author: "Charles",
      status: { kind: "review", label: "With lawyer · 3d" },
      repository: "Tumaini Welfare Society",
      opened: "2:30 PM, 8 Nov 2026",
      age: "3d",
      today: false,
      additions: 14,
      deletions: 2,
      comments: 4,
      problem: ["The society's constitution has not been updated since 2019, and two officials' details don't match the Registrar of Societies record."],
      approach: ["LexAudit drafted an 11-page report. No lawyer is assigned yet, so Charles is holding it for review."],
    },
    {
      number: 105,
      title: "Beneficial ownership — BOF-1 lodgement",
      author: "Achieng",
      status: { kind: "open", label: "Opened 4h ago" },
      repository: "Amani Logistics Limited",
      opened: "7:50 AM, 11 Nov 2026",
      age: "4h",
      today: false,
      additions: 3,
      deletions: 1,
      comments: 3,
      problem: ["Savannah Holdings PLC holds 10%, which makes its owner a beneficial owner. No signed `BOF-1` has been lodged."],
      approach: ["LexReg prepares the form from the register for signature. The client lodges it on BRS and uploads the acknowledgement."],
    },
    {
      number: 106,
      title: "ODPC registration — data controller",
      author: "Wanjiku",
      status: { kind: "merged", label: "Completed 1d ago" },
      repository: "Kilele Partners",
      opened: "11:15 AM, 10 Nov 2026",
      age: "1d",
      today: false,
      additions: 3,
      deletions: 0,
      comments: 1,
      problem: ["As a firm that handles client personal data, Kilele Partners must register as a data controller under the Kenya Data Protection Act 2019."],
      approach: ["Registration filed with the ODPC; the certificate is in the vault and its renewal date is on the compliance calendar."],
    },
  ],
};
