"use client";

import clsx from "clsx";
import { useCallback, useEffect, useState, useTransition } from "react";
import { FaPlus } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { SearchField } from "@/components/ui/SearchField/SearchField";
import { getConsultationsPaginatedAction } from "@/features/consultations/actions";
import type { ConsultationRow } from "@/features/consultations/queries";
import { useDebounce } from "@/lib/useDebounce";

import styles from "./ConsultationTable.module.css";

const statusClassMap: Record<string, string> = {
  Scheduled: styles.statusScheduled,
  Completed: styles.statusCompleted,
  Accepted: styles.statusAccepted,
  Rejected: styles.statusRejected,
  Cancelled: styles.statusCancelled,
};

const columns: ColumnDef<ConsultationRow>[] = [
  {
    id: "clientName",
    name: "Client Name",
    isRowHeader: true,
    allowsSorting: true,
  },
  {
    id: "concern",
    name: "Concern",
    allowsSorting: true,
  },
  {
    id: "createdByName",
    name: "Created By",
    allowsSorting: true,
  },
  {
    id: "booking_datetime",
    name: "Date & Time",
    allowsSorting: true,
    render: (value) => {
      const date = value as Date;
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    },
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

export function ConsultationTable() {
  const [items, setItems] = useState<ConsultationRow[]>([]);
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
      const result = await getConsultationsPaginatedAction({
        search: debouncedSearch,
        pageSize: 10,
      });
      if (cancelled) return;
      setItems(result.consultations);
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
      const result = await getConsultationsPaginatedAction({
        search: debouncedSearch,
        cursor,
        pageSize: 10,
      });
      setItems((prev) => [...prev, ...result.consultations]);
      setCursor(result.nextCursor);
      setHasMore(result.nextCursor !== null);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, hasMore, cursor, debouncedSearch]);

  const emptyContent =
    debouncedSearch && items.length === 0 && !isLoading
      ? `No consultations matching "${debouncedSearch}"`
      : !debouncedSearch && items.length === 0 && !isLoading
        ? "No consultations yet"
        : undefined;

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search consultations..."
            aria-label="Search consultations"
          />
        </div>
        <Button variant="secondary" className={styles.addButton} aria-label="Add consultation">
          <FaPlus /> Add Consultation
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
