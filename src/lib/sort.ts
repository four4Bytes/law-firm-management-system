import type { SortDescriptor } from "react-aria-components";

import type { SortQuery } from "./types";

export function toSortQuery(descriptor: SortDescriptor | undefined): SortQuery | undefined {
  if (!descriptor) return;
  return {
    column: String(descriptor.column),
    direction: descriptor.direction === "ascending" ? "asc" : "desc",
  };
}
