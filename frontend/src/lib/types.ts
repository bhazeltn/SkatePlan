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
  weekly_ice_minutes?: number;
  has_active_restriction?: boolean;
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
  has_active_restriction: boolean;
}

export interface DashboardSummary {
  roster: DashboardRosterSkater[];
  alerts: DashboardAlert[];
  restrictions: DashboardRestriction[];
  upcoming_competitions: DashboardCompetition[];
}
