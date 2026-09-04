import type { OrchestrateSkaterPayload } from "@/lib/types";

export interface RegisterFields {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  date_of_birth: string;
  unit_name: string;
  coach_user_id: string;
  guardian_email: string;
}

export const EMPTY_FIELDS: RegisterFields = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  date_of_birth: "",
  unit_name: "",
  coach_user_id: "",
  guardian_email: "",
};

const REQUIRED: (keyof RegisterFields)[] = [
  "first_name",
  "last_name",
  "email",
  "password",
  "date_of_birth",
  "unit_name",
  "coach_user_id",
];

/** Returns a map of field -> error message for any missing required field. */
export function validate(fields: RegisterFields): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  for (const key of REQUIRED) {
    if (!fields[key].trim()) errors[key] = "This field is required";
  }
  return errors;
}

/** True when the DOB indicates the skater is a minor (< 18) — SafeSport tier. */
export function isMinor(dob: string): boolean {
  if (!dob) return false;
  const birth = new Date(dob);
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return birth > cutoff;
}

/** Build the backend orchestrate payload from validated form fields. Only
 *  backend-accepted fields are included so it integrates with the live API. */
export function buildPayload(fields: RegisterFields): OrchestrateSkaterPayload {
  return {
    first_name: fields.first_name.trim(),
    last_name: fields.last_name.trim(),
    email: fields.email.trim(),
    password: fields.password,
    date_of_birth: fields.date_of_birth,
    unit_name: fields.unit_name.trim(),
    coach_user_id: Number(fields.coach_user_id),
    role_in_unit: "primary",
  };
}
