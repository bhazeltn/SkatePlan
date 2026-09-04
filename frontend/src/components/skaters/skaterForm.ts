// Shared onboarding-form helpers: age gating + standard competitive levels.

// Standard singles competitive levels (fixed list, federation-independent).
export const LEVELS = [
  "StarSkate",
  "Juvenile",
  "Pre-Novice",
  "Novice",
  "Junior",
  "Senior",
  "Adult",
] as const;

export interface SkaterFields {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  home_club: string;
  competitive_level: string;
  skater_email: string;
  guardian_email: string;
}

export const EMPTY_SKATER: SkaterFields = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  home_club: "",
  competitive_level: "",
  skater_email: "",
  guardian_email: "",
};

/** Whole-year age from an ISO yyyy-mm-dd string, or null if unparseable. */
export function computeAge(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) {
    age -= 1;
  }
  return age;
}

/** Treat unknown/blank DOB as a minor (SafeSport-safe default). */
export function isMinor(dob: string): boolean {
  const age = computeAge(dob);
  return age === null ? true : age < 18;
}
