/**
 * Sensitive field detection — Hone must never activate on password, payment,
 * or one-time-code inputs so secrets are never captured or sent to AI providers.
 *
 * `isSensitiveFieldDescriptor` is intentionally DOM-free (plain object in,
 * boolean out) so it can be unit-tested directly under `node --test`.
 */

/** Input types that are always treated as secrets. */
const SENSITIVE_INPUT_TYPES: ReadonlySet<string> = new Set([
  "password",
]);

/** Autocomplete tokens (HTML autofill spec) that mark a field as a secret. */
const SENSITIVE_AUTOCOMPLETE_TOKENS: ReadonlySet<string> = new Set([
  "current-password",
  "new-password",
  "one-time-code",
  "otp",
  "cc-number",
  "cc-csc",
  "cc-exp",
  "cc-exp-month",
  "cc-exp-year",
  "cc-name",
  "cc-type",
]);

/**
 * Attribute heuristics for sites that label secret fields with type="text".
 * Uses non-letter boundaries so "shipping" (contains "pin") or "bypass"
 * (contains "pass") do not false-positive.
 */
const SENSITIVE_ATTR_RE =
  /(^|[^a-z])(password|passwd|passwort|passcode|pwd|pass|pin|pincode|cvv|cvc|csc|otp|one[-_ ]?time[-_ ]?code|card[-_ ]?(number|code)|credit[-_ ]?card|security[-_ ]?code)([^a-z]|$)/i;

export interface SensitiveFieldDescriptor {
  type?: string | null;
  autocomplete?: string | null;
  name?: string | null;
  id?: string | null;
  placeholder?: string | null;
  ariaLabel?: string | null;
  title?: string | null;
}

/** Pure check: does this field descriptor look like a secret field? */
export function isSensitiveFieldDescriptor(
  d: SensitiveFieldDescriptor,
): boolean {
  const type = (d.type ?? "").toLowerCase();
  if (SENSITIVE_INPUT_TYPES.has(type)) return true;

  const autocomplete = (d.autocomplete ?? "").toLowerCase();
  for (const token of autocomplete.split(/\s+/)) {
    if (SENSITIVE_AUTOCOMPLETE_TOKENS.has(token)) return true;
  }

  return [d.name, d.id, d.placeholder, d.ariaLabel, d.title].some(
    (value) =>
      typeof value === "string" &&
      value.length > 0 &&
      SENSITIVE_ATTR_RE.test(value),
  );
}

/**
 * DOM wrapper: true when the element is an <input> that looks like a secret
 * field (password, card number, OTP, or password-like labeling).
 */
export function isSensitiveField(element: Element | null): boolean {
  if (!element || element.tagName?.toLowerCase() !== "input") return false;
  const input = element as HTMLInputElement;
  return isSensitiveFieldDescriptor({
    type: input.getAttribute("type") ?? input.type,
    autocomplete: input.getAttribute("autocomplete"),
    name: input.getAttribute("name"),
    id: input.getAttribute("id"),
    placeholder: input.getAttribute("placeholder"),
    ariaLabel: input.getAttribute("aria-label"),
    title: input.getAttribute("title"),
  });
}
