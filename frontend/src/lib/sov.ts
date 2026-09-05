/** Deterministic client-side Base Value math for the program sandbox builder.
 *
 * Pure arithmetic — no randomness, no LLM. Mirrors the ISU convention that a
 * jump executed in the second half of a program earns a 1.1x base-value bonus.
 */
import type { SovElement } from "@/lib/types";

export const SECOND_HALF_MULTIPLIER = 1.1;

export interface PlannedElement {
  element_code: string;
  is_second_half_bonus: boolean;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const JUMP_REGEX = /^[1-4]?(?:A|T|S|Lo|Eu|F|Lz)(?:<<|<|q|e|\!)?$/i;

/** Returns true if the element (or all parts of a combo) is a jump element. */
export function isJumpElement(code: string): boolean {
  if (!code) return false;
  const parts = code.split("+").map((p) => p.trim());
  return parts.length > 0 && parts.every((part) => JUMP_REGEX.test(part));
}

/** Base value for a single element code (combos summed across "+" tokens). */
export function baseValueOf(
  code: string,
  catalog: Map<string, number>
): number {
  return code
    .split("+")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.toUpperCase() !== "SEQ")
    .reduce((sum, token) => sum + (catalog.get(token) ?? 0), 0);
}

/** Base value for one planned element, applying the second-half bonus to eligible jumps. */
export function elementTotal(
  element: PlannedElement,
  catalog: Map<string, number>
): number {
  const base = baseValueOf(element.element_code, catalog);
  const eligible = isJumpElement(element.element_code);
  return element.is_second_half_bonus && eligible ? base * SECOND_HALF_MULTIPLIER : base;
}

/** Rounded total planned base value across all elements. */
export function totalBaseValue(
  elements: PlannedElement[],
  catalog: Map<string, number>
): number {
  const sum = elements.reduce((acc, el) => acc + elementTotal(el, catalog), 0);
  return round2(sum);
}

/** Build a code -> base value lookup from the SOV reference list. */
export function toCatalog(elements: SovElement[]): Map<string, number> {
  return new Map(elements.map((e) => [e.element_code, Number(e.base_value)]));
}

export function formatBV(value: number): string {
  return value.toFixed(2);
}
