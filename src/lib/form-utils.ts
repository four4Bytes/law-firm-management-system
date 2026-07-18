import { CalendarDate, getLocalTimeZone } from "@internationalized/date";
import type { Key } from "react-aria-components";
import { z, type ZodType } from "zod";

/**
 * Shared normalization and validation helpers for modal forms.
 *
 * Keeps string handling, enum coercion, and RAC field validation consistent
 * across the feature modals so each component does not re-implement trimming
 * or schema derivation inline.
 */

/**
 * Returns the trimmed string, or `undefined` when empty/whitespace-only.
 *
 * @param value - The raw input string.
 * @returns The trimmed string, or `undefined` if only whitespace.
 */
export function optionalString(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Trims the input. Non-empty validation is handled downstream by `requiredText`.
 *
 * @param value - The raw input string.
 * @returns The trimmed string.
 */
export function requiredString(value: string): string {
  return value.trim();
}

/**
 * Converts an `@internationalized/date` `CalendarDate` to a local-timezone `Date`.
 *
 * @param date - The calendar date from a DatePicker.
 * @returns A JavaScript Date in the local timezone.
 */
export function toDateValue(date: CalendarDate): Date {
  return date.toDate(getLocalTimeZone());
}

/**
 * Resolves a React Aria `Key` (or `null`) to its corresponding enum member,
 * falling back to the first enum member when the key is missing.
 *
 * @typeParam E - The enum const-object (e.g. `typeof TaskStatus`).
 * @param key - The selected key, or `null`.
 * @param enumObject - The enum const-object to look up.
 * @returns The matching enum member, or the first member when key is `null`.
 */
export function coerceEnum<E extends Record<string, string>>(
  key: Key | null,
  enumObject: E,
): E[keyof E] {
  return enumObject[(key ?? Object.keys(enumObject)[0]) as keyof E];
}

/**
 * Builds a `Select` `onChange` handler that maps the selected `Key` to an enum
 * member and forwards it to `onChange`. Null selections are ignored.
 *
 * @typeParam E - The enum const-object (e.g. `typeof TaskStatus`).
 * @param enumObject - The enum const-object to map keys against.
 * @param onChange - Callback receiving the resolved enum member.
 * @returns A handler compatible with `Select`'s `onSelectionChange`.
 */
export function selectEnumHandler<E extends Record<string, string>>(
  enumObject: E,
  onChange: (value: E[keyof E]) => void,
) {
  return (key: Key | null) => {
    if (key != null) onChange(enumObject[key as keyof E]);
  };
}

/**
 * Collects React Aria selection `Key`s into a `Set<string>`.
 *
 * @param keys - An iterable of React Aria `Key`s (e.g. from `selectedKeys`).
 * @returns A `Set` of stringified keys.
 */
export function keysToSet(keys: Iterable<Key>): Set<string> {
  return new Set(Array.from(keys, String));
}

/**
 * Builds a required, trimmed string schema with user-facing validation
 * messages. An empty/whitespace value surfaces `${label} is required`; an
 * over-length value surfaces `${label} must be at most ${max} characters`.
 *
 * @param max - Maximum allowed characters.
 * @param label - Human-readable field name (capitalized).
 * @returns A Zod string schema.
 */
export function requiredText(max: number, label: string): z.ZodString {
  return z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);
}

/**
 * Builds an optional, trimmed string schema with an over-length message.
 */
export function optionalText(max: number, label: string): z.ZodOptional<z.ZodString>;

/**
 * Builds an optional, trimmed string schema that defaults to an empty string
 * when `withDefault` is true.
 */
export function optionalText(
  max: number,
  label: string,
  withDefault: true,
): z.ZodDefault<z.ZodOptional<z.ZodString>>;
/**
 * @param max - Maximum allowed characters.
 * @param label - Human-readable field name (capitalized).
 * @param withDefault - When true, defaults to an empty string.
 * @returns An optional Zod string schema, optionally with a default.
 */
export function optionalText(max: number, label: string, withDefault = false) {
  const base = z.string().trim().max(max, `${label} must be at most ${max} characters`).optional();
  return withDefault ? base.default("") : base;
}

/**
 * Builds a positive number schema (coerced from input) with user-facing
 * messages for non-numeric, non-positive, and over-maximum values.
 *
 * @param max - Maximum allowed value (inclusive).
 * @param label - Human-readable field name (capitalized).
 * @returns A Zod number schema that coerces from string input.
 */
export function positiveNumber(max: number, label: string) {
  return z.coerce
    .number({ error: `Enter a valid ${label.toLowerCase()}` })
    .positive(`${label} must be greater than 0`)
    .max(max, `${label} must not exceed ${max}`);
}

/**
 * Builds a non-negative integer schema with user-facing error messages.
 * Use for fields like `reminder_days` that accept zero or positive whole numbers.
 *
 * @param label - Human-readable field name (capitalized).
 * @returns A Zod number schema requiring integer >= 0.
 */
export function nonNegativeInteger(label: string) {
  return z
    .number({ message: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(0, `${label} must be 0 or greater`);
}

/**
 * Builds a required enum schema with a user-facing message when the value is
 * missing or outside the allowed set.
 *
 * @typeParam E - The enum const-object (e.g. `typeof TaskStatus`).
 * @param enumObject - The enum const-object to derive allowed values from.
 * @param label - Human-readable field name (capitalized).
 * @returns A Zod enum schema.
 */
export function requiredEnum<E extends Record<string, string>>(enumObject: E, label: string) {
  return z.enum(enumObject, { error: `Select a ${label.toLowerCase()}` });
}

/**
 * Builds a required, trimmed email schema with user-facing messages for
 * malformed or over-length values.
 *
 * @param label - Human-readable field name (capitalized, e.g. "Email").
 * @returns A Zod string schema with email validation.
 */
export function emailText(label: string) {
  return z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(255, `${label} must be at most 255 characters`)
    .pipe(z.email({ error: `Enter a valid ${label.toLowerCase()}` }));
}

/**
 * Derives a React Aria `validate` function from a Zod sub-schema. Empty
 * strings are normalized to `undefined` so optional fields validate cleanly,
 * returning `null` on success or the first issue message on failure.
 *
 * @typeParam S - The Zod schema type to validate against.
 * @param schema - A Zod schema (e.g. `requiredString`).
 * @returns A validate function compatible with RAC `validate` props.
 */
export function createFieldValidator<S extends ZodType>(schema: S) {
  return (value: unknown): string | null => {
    const normalized = typeof value === "string" && value.trim() === "" ? undefined : value;
    const result = schema.safeParse(normalized);
    if (result.success) return null;
    return result.error.issues[0]?.message ?? "Invalid value";
  };
}
