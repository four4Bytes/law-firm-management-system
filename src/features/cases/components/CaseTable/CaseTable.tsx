"use client";

import clsx from "clsx";
import { useCallback, useEffect, useState, useTransition } from "react";
import { FaPlus } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { SearchField } from "@/components/ui/SearchField/SearchField";
import { getCasesPaginatedAction } from "@/features/cases/actions";
import type { CaseRow } from "@/features/cases/queries";
import { useDebounce } from "@/lib/useDebounce";

import styles from "./CaseTable.module.css";

const statusClassMap: Record<string, string> = {
  Pending: styles.statusPending,
  Done: styles.statusDone,
  Cancelled: styles.statusCancelled,
};

const columns: ColumnDef<CaseRow>[] = [
  {
    id: "case_title",
    name: "Case Title",
    isRowHeader: true,
    allowsSorting: true,
  },
  {
    id: "clientName",
    name: "Client Name",
    allowsSorting: true,
  },
  {
    id: "case_type",
    name: "Type",
    allowsSorting: true,
  },
  {
    id: "assignTo",
    name: "Assign To",
  },
  {
    id: "latestMilestone",
    name: "Latest Milestone",
  },
  {
    id: "status",
    name: "Status",
    render: (value) => {
      const status = value as string | null;
      if (!status) return null;
      return <span className={clsx(styles.statusBadge, statusClassMap[status])}>{status}</span>;
    },
  },
];

export function CaseTable() {
  const [items, setItems] = useState<CaseRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const isLoading = isPending || isLoadingMore;

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    let cancelled = false;

    startTransition(async () => {
      const result = await getCasesPaginatedAction({ search: debouncedSearch, pageSize: 10 });
      if (cancelled) return;
      setItems(result.cases);
      setCursor(result.nextCursor);
      setHasMore(result.nextCursor !== null);
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, startTransition]);

  const handleLoadMore = useCallback(async () => {
    if (isLoading || !hasMore || !cursor) return;

    setIsLoadingMore(true);

    try {
      const result = await getCasesPaginatedAction({
        search: debouncedSearch,
        cursor,
        pageSize: 10,
      });
      setItems((prev) => [...prev, ...result.cases]);
      setCursor(result.nextCursor);
      setHasMore(result.nextCursor !== null);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, hasMore, cursor, debouncedSearch]);

  const emptyContent =
    debouncedSearch && items.length === 0 && !isLoading
      ? `No cases matching "${debouncedSearch}"`
      : !debouncedSearch && items.length === 0 && !isLoading
        ? "No cases yet"
        : undefined;

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search cases..."
            aria-label="Search cases"
          />
        </div>
        <Button variant="secondary" className={styles.addButton} aria-label="Add case">
          <FaPlus /> Add Case
        </Button>
      </div>
      <DataTable
        columns={columns}
        rows={items}
        selectionMode="single"
        selectionBehavior="replace"
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        isLoading={isLoading}
        emptyContent={emptyContent}
      />
    </div>
  );
}
