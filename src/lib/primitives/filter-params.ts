import type { FilterValues } from "@/lib/primitives/types";

/** URL filter-param codec for list pages backed by `ServerDataTable`. */

/**
 * Minimal allowlist shape for URL filter sync. `FilterDefinition` from
 * `TableFilter` satisfies this structurally; the codec only needs each
 * filter's key and its permitted option values.
 */
export interface FilterParamAllowlist {
  key: string;
  options: readonly { value: string }[];
}

/**
 * Serializes filter values to URL params using repeated-key encoding
 * (e.g. `?status=Open&status=Settled`). Empty selections are omitted.
 *
 * @param values - The active filter selections keyed by filter key.
 * @returns URL params holding only the non-empty selections.
 */
export function filterValuesToSearchParams(values: FilterValues): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, selected] of Object.entries(values)) {
    for (const value of selected) {
      params.append(key, value);
    }
  }
  return params;
}

/**
 * Parses URL params into filter values, keeping only values present in the
 * allowlist. Unknown keys and unknown values are dropped so hand-crafted
 * URLs degrade to a weaker filter instead of breaking the page.
 *
 * @param params - The current URL params (e.g. from `useSearchParams()`).
 * @param allowlists - The filters eligible for URL sync with their permitted values.
 * @returns Filter values containing only allowlisted selections.
 */
export function searchParamsToFilterValues(
  params: Pick<URLSearchParams, "getAll">,
  allowlists: readonly FilterParamAllowlist[],
): FilterValues {
  const values: FilterValues = {};
  for (const { key, options } of allowlists) {
    const allowed = new Set(options.map((option) => option.value));
    const selected = [...new Set(params.getAll(key))].filter((value) => allowed.has(value));
    if (selected.length > 0) {
      values[key] = selected;
    }
  }
  return values;
}

/**
 * Merges filter values into existing URL params. Filter-owned keys (those in
 * the allowlists) are replaced wholesale; every other param (e.g. `tab`)
 * passes through untouched. Clearing all filters removes the filter keys.
 *
 * @param current - The current URL params to merge into.
 * @param values - The new filter selections keyed by filter key.
 * @param allowlists - The filters eligible for URL sync.
 * @returns The merged URL params.
 */
export function withFilterValues(
  current: URLSearchParams,
  values: FilterValues,
  allowlists: readonly FilterParamAllowlist[],
): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  for (const { key } of allowlists) {
    next.delete(key);
  }
  const encoded = filterValuesToSearchParams(values);
  for (const [key, value] of encoded) {
    next.append(key, value);
  }
  return next;
}
