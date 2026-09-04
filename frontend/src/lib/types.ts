export type SystemRole = "coach" | "athlete" | "parent" | "admin";

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  role: SystemRole;
}

export interface RegisterCoachPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  club?: string;
}

export interface OrchestrateSkaterPayload {
  email?: string;
  password?: string;
  contact_email?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth: string; // ISO yyyy-mm-dd (SafeSport tier source of truth)
  home_club?: string;
  federation_registration_id?: string;
  federation_id?: number;
  current_level_id?: number;
  competitive_level?: string;
  unit_name?: string;
  coach_user_id: number;
  role_in_unit?: "primary" | "secondary" | "choreographer";
}

export interface Federation {
  id: number;
  name: string;
  code: string;
  country: string;
}

export interface OrchestrateSkaterResponse {
  skater_id: number;
  training_unit_id: number;
  roster_entry_id: number;
  assignment_id: number;
}

export interface Skater {
  skater_id: number;
  first_name: string;
  last_name: string;
  home_club?: string | null;
  level_name?: string | null;
  competitive_level?: string | null;
  federation_name?: string | null;
  country_code?: string | null;
  weekly_ice_minutes?: number;
  has_active_restriction?: boolean;
}

export interface SovElement {
  element_code: string;
  element_name: string;
  base_value: number;
}

export interface SkaterProgram {
  id: string;
  program_type: string;
  title: string;
  season?: string | null;
}

export interface SkaterRestriction {
  id?: string;
  title: string;
  restrictions?: string | null;
  status: string;
}

export const RESTRICTION_TYPES = [
  "Jump Impact Limit",
  "Edge/Spin Work Only",
  "Total Rest",
  "Custom Note",
] as const;

export interface RestrictionCreatePayload {
  restriction_type: string;
  excluded_elements?: string;
  review_date?: string; // ISO yyyy-mm-dd expected return / review date
  notes?: string;
}

export interface SkaterDetail {
  skater_id: number;
  first_name: string;
  last_name: string;
  home_club?: string | null;
  competitive_level?: string | null;
  federation_name?: string | null;
  country_code?: string | null;
  has_active_restriction: boolean;
  restrictions: SkaterRestriction[];
  programs: SkaterProgram[];
}

export type GapStatus = "met" | "developing" | "not_started" | string;

export interface GapEntry {
  benchmark_id: number;
  title: string;
  evaluation_mode: string;
  status: GapStatus;
  measured?: number | null;
  target?: number | null;
  delta?: number | null;
}

export interface BenchmarkTemplate {
  key: string;
  level: string;
  label: string;
  pillar_targets: Record<string, string>;
}

export interface GapDeltaFlag {
  pillar: string;
  score: string;
  target: string;
  met: boolean;
}

export interface SavedGapAssessment {
  id: string;
  skater_id: number;
  benchmark_framework: string;
  evaluation_date?: string | null;
  pillar_scores: Record<string, string>;
  coach_notes?: string | null;
  delta_flags: GapDeltaFlag[];
  gaps_identified: number;
  benchmarks_met: number;
}

export interface GapAssessmentPayload {
  benchmark_framework: string;
  evaluation_date?: string | null;
  pillar_scores: Record<string, string>;
  coach_notes?: string | null;
}

export interface GapReport {
  skater_id: number;
  target_standard_id: number;
  pillars: Record<string, GapEntry[]>;
  latest_assessment?: SavedGapAssessment | null;
}

export interface ProgramElementPayload {
  segment_order: number;
  element_code: string;
  is_second_half_bonus: boolean;
}

export interface ProgramCreatePayload {
  skater_id: number;
  program_type: string;
  title: string;
  program_elements: ProgramElementPayload[];
}

export interface DashboardAlert {
  kind: "missing_plan" | "at_risk_goal" | string;
  skater_id: number;
  skater_name: string;
  message: string;
  severity: "warning" | "danger" | string;
}

export interface DashboardRestriction {
  skater_id: number;
  skater_name: string;
  title: string;
  restrictions?: string | null;
  status: string;
}

export interface DashboardCompetition {
  competition_id: string;
  name: string;
  start_date?: string | null;
  entry_status: string;
  skater_names: string[];
}

export interface DashboardRosterSkater {
  skater_id: number;
  first_name: string;
  last_name: string;
  home_club?: string | null;
  level_name?: string | null;
  competitive_level?: string | null;
  federation_name?: string | null;
  country_code?: string | null;
  has_active_restriction: boolean;
}

export interface DashboardSummary {
  roster: DashboardRosterSkater[];
  alerts: DashboardAlert[];
  restrictions: DashboardRestriction[];
  upcoming_competitions: DashboardCompetition[];
}
