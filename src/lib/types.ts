/** Shared query parameter types for paginated, sortable list endpoints. */

/** Sort instruction for a single column. */
export interface SortQuery {
  column: string;
  direction: "asc" | "desc";
}

/** Cursor-paginated query parameters accepted by list Server Actions. */
export interface PageQuery {
  search?: string;
  cursor?: string;
  pageSize?: number;
  sort?: SortQuery;
}
