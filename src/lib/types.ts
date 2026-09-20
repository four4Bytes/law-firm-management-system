/** Shared query parameter types for paginated, sortable list endpoints. */

/** Sort instruction for a single column. */
export interface SortQuery {
  column: string;
  direction: "asc" | "desc";
}

/** Selected filter values keyed by filter key (e.g. `{ status: ["Open"] }`). */
export type FilterValues = Record<string, string[]>;

/** Cursor-paginated query parameters accepted by list Server Actions. */
export interface PageQuery {
  search?: string;
  cursor?: string;
  pageSize?: number;
  sort?: SortQuery;
  filters?: FilterValues;
}

export interface TaskPageQuery extends PageQuery {
  taskId: string;
}

export interface CasePageQuery extends PageQuery {
  caseId: string;
}
