export interface SortQuery {
  column: string;
  direction: "asc" | "desc";
}

export interface PageQuery {
  search?: string;
  cursor?: string;
  pageSize?: number;
  sort?: SortQuery;
}
