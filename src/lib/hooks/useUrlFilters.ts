"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import {
  searchParamsToFilterValues,
  withFilterValues,
  type FilterParamAllowlist,
} from "@/lib/primitives/filter-params";
import type { FilterValues } from "@/lib/primitives/types";

/**
 * Syncs list-page filter selections with the URL, making the URL the source
 * of truth. Reading a shared link reproduces the same filtered list, and
 * back/forward navigation restores prior selections. Filter-owned keys are
 * replaced wholesale; unrelated params (e.g. `tab`) pass through untouched.
 * Use only on top-level list pages — embedded detail tabs keep in-memory
 * filter state so sibling tables never fight over the same param keys.
 *
 * @param allowlists - The filters eligible for URL sync with their permitted values.
 * @returns The current URL-derived filter values and an updater that replaces the URL.
 */
export function useUrlFilters(
  allowlists: readonly FilterParamAllowlist[],
): [FilterValues, (values: FilterValues) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const values = useMemo(
    () => searchParamsToFilterValues(searchParams, allowlists),
    [searchParams, allowlists],
  );

  const updateValues = useCallback(
    (next: FilterValues) => {
      const merged = withFilterValues(
        new URLSearchParams(searchParams.toString()),
        next,
        allowlists,
      );
      const query = merged.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams, allowlists],
  );

  return [values, updateValues];
}
