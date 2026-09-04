import type { BenchmarkStatus, GapDeltaFlag, SkaterBenchmark } from "@/lib/types";

// The four Sprint 4 development pillars in canonical display order.
export const ASSESSMENT_PILLARS: { key: string; label: string }[] = [
  { key: "technical", label: "Technical (Jumps / Spins)" },
  { key: "skating_skills", label: "Skating Skills" },
  { key: "physical", label: "Physical Readiness" },
  { key: "performance", label: "Performance" },
];

// Ordinal scoring scale shared with the backend contract.
export const SCORE_LEVELS = [
  "Not Introduced",
  "Acquiring",
  "Meeting Standard",
  "Exceeding",
] as const;

export type ScoreLevel = (typeof SCORE_LEVELS)[number];

export const SCORE_RANK: Record<string, number> = {
  "Not Introduced": 0,
  Acquiring: 1,
  "Meeting Standard": 2,
  Exceeding: 3,
};

export const EXIT_TARGET = "Meeting Standard";

export const PILLAR_LABEL: Record<string, string> = Object.fromEntries(
  ASSESSMENT_PILLARS.map((p) => [p.key, p.label])
);

// Deterministic priority ranking: biggest shortfall from the exit target first,
// ties broken by canonical pillar order. Returns the top three unmet pillars.
export function topPriorities(flags: GapDeltaFlag[]): GapDeltaFlag[] {
  const order = ASSESSMENT_PILLARS.map((p) => p.key);
  return [...flags]
    .filter((f) => !f.met)
    .sort((a, b) => {
      const gapA = SCORE_RANK[EXIT_TARGET] - (SCORE_RANK[a.score] ?? 0);
      const gapB = SCORE_RANK[EXIT_TARGET] - (SCORE_RANK[b.score] ?? 0);
      if (gapB !== gapA) return gapB - gapA;
      return order.indexOf(a.pillar) - order.indexOf(b.pillar);
    })
    .slice(0, 3);
}

// --- Sprint 6: fully coach-driven custom benchmarks ----------------------
// Canonical status enum paired with the coach-facing UI label.
export const BENCHMARK_STATUSES: { value: BenchmarkStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "Not Introduced" },
  { value: "DEVELOPING", label: "Developing" },
  { value: "SOLIDIFYING", label: "Solidifying" },
  { value: "MET", label: "Met" },
];

// Suggested categories; coaches may also type a custom category.
export const BENCHMARK_CATEGORIES = [
  "Jumps",
  "Spins",
  "Steps",
  "PCS / Skating Skills",
  "Physical / Load",
  "Mental / Self-Skills",
] as const;

export const BENCHMARK_STATUS_LABEL: Record<string, string> =
  Object.fromEntries(BENCHMARK_STATUSES.map((s) => [s.value, s.label]));

/** Group benchmarks by their category, preserving first-seen category order. */
export function groupByCategory(
  items: SkaterBenchmark[]
): [string, SkaterBenchmark[]][] {
  const groups = new Map<string, SkaterBenchmark[]>();
  items.forEach((item) => {
    const bucket = groups.get(item.category) ?? [];
    bucket.push(item);
    groups.set(item.category, bucket);
  });
  return [...groups.entries()];
}

export interface BenchmarkSummary {
  total: number;
  met: number;
  developing: number;
  gaps: number;
  pctMet: number;
}

/** Deterministic gap-delta rollup. The four statuses form a clean partition:
 *  met = MET, developing = DEVELOPING + SOLIDIFYING, gaps (unmet) = NOT_STARTED. */
export function summarizeBenchmarks(items: SkaterBenchmark[]): BenchmarkSummary {
  const total = items.length;
  const met = items.filter((i) => i.status === "MET").length;
  const developing = items.filter(
    (i) => i.status === "DEVELOPING" || i.status === "SOLIDIFYING"
  ).length;
  const gaps = items.filter((i) => i.status === "NOT_STARTED").length;
  const pctMet = total === 0 ? 0 : Math.round((met / total) * 100);
  return { total, met, developing, gaps, pctMet };
}
