"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import {
  areFilterValuesEqual,
  searchParamsToFilterValues,
  withFilterValues,
  type FilterParamAllowlist,
} from "@/lib/primitives/filter-params";
import type { FilterValues } from "@/lib/primitives/types";

/**
 * Syncs list-page filter selections with the URL, keeping local state as the
 * source of truth so checkbox feedback is instant. The URL is a silent mirror
 * (via `history.replaceState`, no server navigation) so shared links and
 * reloads reproduce the same filtered list, and cross-page back/forward
 * navigation restores prior selections. Filter-owned keys are replaced
 * wholesale; unrelated params (e.g. `tab`) pass through untouched. Use only
 * on top-level list pages — embedded detail tabs keep in-memory filter state
 * so sibling tables never fight over the same param keys.
 *
 * @param allowlists - The filters eligible for URL sync with their permitted values.
 * @returns The current filter values and an updater that applies instantly and mirrors to the URL.
 */
export function useUrlFilters(
  allowlists: readonly FilterParamAllowlist[],
): [FilterValues, (values: FilterValues) => void] {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlValues = useMemo(
    () => searchParamsToFilterValues(searchParams, allowlists),
    [searchParams, allowlists],
  );

  const [prevUrlValues, setPrevUrlValues] = useState<FilterValues>(urlValues);
  const [optimisticValues, setOptimisticValues] = useState<FilterValues>(urlValues);

  if (!areFilterValuesEqual(prevUrlValues, urlValues)) {
    setPrevUrlValues(urlValues);
    setOptimisticValues(urlValues);
  }

  const updateValues = useCallback(
    (next: FilterValues) => {
      setOptimisticValues(next);
      const merged = withFilterValues(
        new URLSearchParams(window.location.search),
        next,
        allowlists,
      );
      const query = merged.toString();
      window.history.replaceState(
        null,
        "",
        `${query ? `${pathname}?${query}` : pathname}${window.location.hash}`,
      );
    },
    [pathname, allowlists],
  );

  return [optimisticValues, updateValues];
}
