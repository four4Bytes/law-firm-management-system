"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type SortDescriptor } from "react-aria-components";
import { FaPlus } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { SearchField } from "@/components/ui/SearchField/SearchField";
import { queue } from "@/components/ui/Toast/Toast";
import { toSortQuery } from "@/lib/sort";
import type { SortQuery } from "@/lib/types";
import { useDebounce } from "@/lib/useDebounce";

import styles from "./ServerDataTable.module.css";

interface ServerDataTableProps<T extends { id: string }> {
  fetchAction: (params: {
    search?: string;
    cursor?: string;
    pageSize?: number;
    sort?: SortQuery;
  }) => Promise<{ rows: T[]; nextCursor: string | null }>;
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  emptyContent?: string;
  loadingMessage?: string;
  searchLabel?: string;
  renderAddButton?: boolean;
  addButtonLabel?: string;
  onAddButtonPress?: () => void;
  selectionMode?: "none" | "single" | "multiple";
  selectionBehavior?: "toggle" | "replace";
  onRowAction?: (key: string) => void;
  refreshTrigger?: number;
  initialRows?: T[];
  initialCursor?: string | null;
}

export function ServerDataTable<T extends { id: string }>({
  fetchAction,
  columns,
  searchPlaceholder = "Search...",
  emptyContent = "No items yet",
  loadingMessage = "Loading...",
  searchLabel = "Search",
  renderAddButton = false,
  addButtonLabel = "Add",
  onAddButtonPress,
  selectionMode = "single",
  selectionBehavior = "replace",
  onRowAction,
  refreshTrigger,
  initialRows,
  initialCursor,
}: ServerDataTableProps<T>) {
  const [items, setItems] = useState<T[]>(initialRows ?? []);
  const [cursor, setCursor] = useState<string | null>(initialCursor ?? null);
  const [hasMore, setHasMore] = useState(initialRows !== undefined ? initialCursor !== null : true);
  const [isInitialLoad, setIsInitialLoad] = useState(initialRows === undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor | undefined>();
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
        });
        if (cancelled) return;
        setItems(result.rows);
        setCursor(result.nextCursor);
        setHasMore(result.nextCursor !== null);
        setIsInitialLoad(false);
      } catch {
        if (cancelled) return;
        setIsInitialLoad(false);
        queue.add({
          title: "Failed to load data",
          description: "Could not retrieve the list. Please try again.",
        });
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, sortDescriptor, refreshTrigger]);

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
      });
      if (gen !== generationRef.current) return;
      setItems((prev) => [...prev, ...result.rows]);
      setCursor(result.nextCursor);
      setHasMore(result.nextCursor !== null);
    } catch {
      queue.add({
        title: "Failed to load more",
        description: "Could not retrieve additional items. Please try again.",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, hasMore, cursor, debouncedSearch, sortDescriptor]);

  const computedEmptyContent =
    debouncedSearch && items.length === 0 && !isLoading
      ? `No results matching "${debouncedSearch}"`
      : items.length === 0 && !isLoading
        ? emptyContent
        : undefined;

  return (
    <div className={styles.content}>
      <div className={styles.toolbar}>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
        />
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
        />
      )}
    </div>
  );
}
