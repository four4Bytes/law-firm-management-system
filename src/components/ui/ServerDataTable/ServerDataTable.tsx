"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type SortDescriptor } from "react-aria-components";
import { FaPlus } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { SearchField } from "@/components/ui/SearchField/SearchField";
import { TableFilter, type FilterDefinition } from "@/components/ui/TableFilter/TableFilter";
import { appendPage } from "@/lib/pagination";
import { toSortQuery } from "@/lib/sort";
import { toastError } from "@/lib/toast-utils";
import type { FilterValues, SortQuery } from "@/lib/types";
import { useDebounce } from "@/lib/useDebounce";

import styles from "./ServerDataTable.module.css";

interface ServerDataTableProps<T extends { id: string }> {
  fetchAction: (params: {
    search?: string;
    cursor?: string;
    pageSize?: number;
    sort?: SortQuery;
    filters?: FilterValues;
  }) => Promise<{ rows: T[]; nextCursor: string | null }>;
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  emptyContent?: string;
  loadingMessage?: string;
  searchLabel?: string;
  filters?: FilterDefinition[];
  renderAddButton?: boolean;
  addButtonLabel?: string;
  onAddButtonPress?: () => void;
  selectionMode?: "none" | "single" | "multiple";
  selectionBehavior?: "toggle" | "replace";
  onRowAction?: (key: string) => void;
  refreshTrigger?: number;
  initialRows?: T[];
  initialCursor?: string | null;
  collectionDependencies?: unknown[];
}

export function ServerDataTable<T extends { id: string }>({
  fetchAction,
  columns,
  searchPlaceholder = "Search...",
  emptyContent = "No items yet",
  loadingMessage = "Loading...",
  searchLabel = "Search",
  filters,
  renderAddButton = false,
  addButtonLabel = "Add",
  onAddButtonPress,
  selectionMode = "single",
  selectionBehavior = "replace",
  onRowAction,
  refreshTrigger,
  initialRows,
  initialCursor,
  collectionDependencies,
}: ServerDataTableProps<T>) {
  const [items, setItems] = useState<T[]>(initialRows ?? []);
  const [cursor, setCursor] = useState<string | null>(initialCursor ?? null);
  const [hasMore, setHasMore] = useState(initialRows !== undefined ? initialCursor !== null : true);
  const [isInitialLoad, setIsInitialLoad] = useState(initialRows === undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor | undefined>();
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [isFetching, setIsFetching] = useState(false);

  const isLoading = isFetching || isLoadingMore;
  const debouncedSearch = useDebounce(search, 300);
  const skipInitialFetch = useRef(initialRows !== undefined);

  const fetchActionRef = useRef(fetchAction);
  useEffect(() => {
    fetchActionRef.current = fetchAction;
  });

  const generationRef = useRef(0);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }

    let cancelled = false;
    ++generationRef.current;

    setIsFetching(true);

    async function fetchData() {
      try {
        const result = await fetchActionRef.current({
          search: debouncedSearch,
          sort: toSortQuery(sortDescriptor),
          pageSize: 10,
          filters: filterValues,
        });
        if (cancelled) return;
        setItems(result.rows);
        setCursor(result.nextCursor);
        setHasMore(result.nextCursor !== null);
        setIsInitialLoad(false);
      } catch {
        if (cancelled) return;
        setIsInitialLoad(false);
        toastError(
          "Failed to load data",
          "The list could not be loaded. Please check your connection and try again.",
        );
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, sortDescriptor, filterValues, refreshTrigger]);

  const handleLoadMore = useCallback(async () => {
    if (isLoading || !hasMore || !cursor) return;

    const gen = generationRef.current;
    setIsLoadingMore(true);
    try {
      const result = await fetchActionRef.current({
        search: debouncedSearch,
        cursor,
        sort: toSortQuery(sortDescriptor),
        pageSize: 10,
        filters: filterValues,
      });
      if (gen !== generationRef.current) return;
      setItems((prev) => appendPage(prev, result.rows));
      setCursor(result.nextCursor);
      setHasMore(result.nextCursor !== null);
    } catch {
      toastError("Failed to load more", "Additional items could not be loaded. Please try again.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, hasMore, cursor, debouncedSearch, sortDescriptor, filterValues]);

  const hasActiveFilters = Object.values(filterValues).some((selected) => selected.length > 0);

  let computedEmptyContent: string | undefined;
  if (items.length === 0 && !isLoading) {
    computedEmptyContent = emptyContent;
    if (hasActiveFilters) {
      computedEmptyContent = "No results matching the current filters";
    }
    if (debouncedSearch) {
      computedEmptyContent = `No results matching "${debouncedSearch}"`;
    }
    if (debouncedSearch && hasActiveFilters) {
      computedEmptyContent = `No results matching "${debouncedSearch}" with the current filters`;
    }
  }

  return (
    <div className={styles.content}>
      <div className={styles.toolbar}>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
        />
        {filters && filters.length > 0 && (
          <TableFilter
            filters={filters}
            values={filterValues}
            onChange={setFilterValues}
            onClear={() => setFilterValues({})}
          />
        )}
        {renderAddButton && (
          <Button
            variant="secondary"
            className={styles.addButton}
            aria-label={addButtonLabel}
            onPress={onAddButtonPress}
          >
            <FaPlus /> {addButtonLabel}
          </Button>
        )}
      </div>
      {isInitialLoad ? (
        <div className={styles.loadingContainer}>
          <ProgressCircle aria-label={loadingMessage} />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={items}
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
          selectionMode={selectionMode}
          selectionBehavior={selectionBehavior}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          isLoading={isLoading}
          emptyContent={computedEmptyContent}
          onRowAction={onRowAction}
          collectionDependencies={collectionDependencies}
        />
      )}
    </div>
  );
}
