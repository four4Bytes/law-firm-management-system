import type { SortDescriptor } from "react-aria-components";

import type { SortQuery } from "./types";

/** Maps a React Aria `SortDescriptor` to the backend-neutral {@link SortQuery}. */

/**
 * Converts a React Aria table/grid `SortDescriptor` into a {@link SortQuery}.
 *
 * @param descriptor - The descriptor from the collection's `onSortChange`.
 * @returns The equivalent `SortQuery`, or `undefined` when no column is sorted.
 */
export function toSortQuery(descriptor: SortDescriptor | undefined): SortQuery | undefined {
  if (!descriptor) return;
  return {
    column: String(descriptor.column),
    direction: descriptor.direction === "ascending" ? "asc" : "desc",
  };
}
