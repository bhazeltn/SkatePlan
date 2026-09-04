import type { GapDeltaFlag } from "@/lib/types";

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
