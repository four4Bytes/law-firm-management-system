/**
 * Environment variable utilities.
 *
 * Provides typed accessors for `process.env` with consistent error messages,
 * optional defaults, and input validation. Use these instead of ad-hoc
 * `process.env` reads so missing or malformed values fail early and clearly.
 */

/** A set of string values that are considered `true` by {@link getEnvBoolean}. */
const TRUTHY_VALUES = new Set(["true", "1", "yes", "on"]);

/**
 * Reads a required environment variable, throwing a clear error when it is
 * unset, empty, or whitespace-only.
 *
 * @param name - The environment variable name (e.g. `"DATABASE_URL"`).
 * @returns The trimmed value.
 */
export function getRequiredEnvVar(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Check your .env file.`);
  }
  return value;
}

/**
 * Reads an optional environment variable, returning a fallback when unset
 * or empty.
 *
 * @param name - The environment variable name.
 * @param fallback - The default value when the variable is unset or empty.
 * @returns The trimmed value or the fallback.
 */
export function getOptionalEnvVar(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value || fallback;
}

/**
 * Reads an environment variable as a boolean.
 *
 * The following case-insensitive values are considered `true`:
 * `"true"`, `"1"`, `"yes"`, `"on"`. Everything else (including unset)
 * is `false`.
 *
 * @param name - The environment variable name.
 * @returns `true` for recognised truthy values, `false` otherwise.
 */
export function getEnvBoolean(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  return value ? TRUTHY_VALUES.has(value) : false;
}

/**
 * Reads a required integer environment variable, throwing on missing or
 * non-integer values.
 *
 * @param name - The environment variable name.
 * @returns The parsed integer.
 */
export function getRequiredInteger(name: string): number {
  const raw = getRequiredEnvVar(name);
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, got: ${raw}`);
  }
  return parsed;
}

/**
 * Reads an optional integer environment variable, returning a fallback when
 * unset or empty. Throws if the value is present but not a valid integer.
 *
 * @param name - The environment variable name.
 * @param fallback - The default value.
 * @returns The parsed integer or the fallback.
 */
export function getOptionalInteger(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, got: ${raw}`);
  }
  return parsed;
}

/**
 * Reads a required float environment variable, throwing on missing or
 * non-numeric values.
 *
 * @param name - The environment variable name.
 * @returns The parsed float.
 */
export function getRequiredFloat(name: string): number {
  const raw = getRequiredEnvVar(name);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be a number, got: ${raw}`);
  }
  return parsed;
}

/**
 * Reads an optional float environment variable, returning a fallback when
 * unset or empty. Throws if the value is present but not a valid number.
 *
 * @param name - The environment variable name.
 * @param fallback - The default value.
 * @returns The parsed float or the fallback.
 */
export function getOptionalFloat(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be a number, got: ${raw}`);
  }
  return parsed;
}
