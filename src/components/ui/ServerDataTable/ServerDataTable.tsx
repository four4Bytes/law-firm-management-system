"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { type SortDescriptor } from "react-aria-components";
import { FaPlus } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { SearchField } from "@/components/ui/SearchField/SearchField";
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
}: ServerDataTableProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor | undefined>();
  const [isPending, startTransition] = useTransition();

  const isLoading = isPending || isLoadingMore;
  const debouncedSearch = useDebounce(search, 300);

  const fetchActionRef = useRef(fetchAction);
  useEffect(() => {
    fetchActionRef.current = fetchAction;
  });

  const generationRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    ++generationRef.current;

    startTransition(async () => {
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
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, sortDescriptor, startTransition]);

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
