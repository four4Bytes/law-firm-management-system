"use client";

import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { Collection, type Selection, type SortDescriptor } from "react-aria-components";
import { FaChevronDown, FaChevronRight } from "react-icons/fa6";

import {
  Cell,
  Column,
  ResizableTableContainer,
  Row,
  Table,
  TableBody,
  TableHeader,
  TableLoadMoreItem,
} from "@/components/ui/Table/Table";
import tableStyles from "@/components/ui/Table/Table.module.css";

import { ProgressCircle } from "../ProgressCircle/ProgressCircle";
import styles from "./DataTable.module.css";

export interface ColumnDef<T> {
  id: keyof T;
  name: string;
  isRowHeader?: boolean;
  allowsSorting?: boolean;
  allowsResizing?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

export interface DataTableProps<T extends { id: string }> {
  columns: ColumnDef<T>[];
  rows: T[];
  sortDescriptor?: SortDescriptor;
  onSortChange?: (descriptor: SortDescriptor) => void;
  selectionMode?: "none" | "single" | "multiple";
  selectionBehavior?: "toggle" | "replace";
  onSelectionChange?: (keys: Selection) => void;
  onRowAction?: (key: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  loadMoreContent?: React.ReactNode;
  emptyContent?: React.ReactNode;
  collectionDependencies?: unknown[];
  className?: string;
  variant?: "card" | "plain";
  expandedKeys?: Set<string>;
  onExpandedChange?: (keys: Set<string>) => void;
  getChildRows?: (row: T) => T[] | null;
  renderExpandedContent?: (row: T) => React.ReactNode;
  expandAriaLabel?: (row: T) => string;
  getExpandAriaLabel?: (row: T) => string;
  expandOnRowClick?: boolean;
  getRowClassName?: (entry: { row: T; detail: boolean; child: boolean }) => string | undefined;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  sortDescriptor: sortDescriptorProp,
  onSortChange,
  selectionMode = "none",
  selectionBehavior = "toggle",
  onSelectionChange,
  onRowAction,
  onLoadMore,
  hasMore,
  isLoading,
  loadMoreContent,
  emptyContent,
  collectionDependencies,
  className,
  variant = "card",
  expandedKeys,
  onExpandedChange,
  getChildRows,
  renderExpandedContent,
  expandAriaLabel,
  getExpandAriaLabel,
  expandOnRowClick = false,
  getRowClassName,
}: DataTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor | undefined>();
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<Set<string>>(new Set());
  const variantClassName = variant === "plain" ? undefined : styles.card;

  const expandable = renderExpandedContent !== undefined || getChildRows !== undefined;
  const expanded = expandedKeys ?? internalExpandedKeys;
  const expandLabel = expandAriaLabel ?? getExpandAriaLabel ?? (() => "Expand row");
  const expandColumnIndex = Math.max(
    0,
    columns.findIndex((col) => col.isRowHeader),
  );

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      setIsScrolled(el.scrollTop > 0);
    }
  }, []);

  function toggleExpanded(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    if (expandedKeys === undefined) {
      setInternalExpandedKeys(next);
    }
    onExpandedChange?.(next);
  }

  useEffect(() => {
    if (!expandOnRowClick || !expandable) return;
    const container = containerRef.current;
    if (!container) return;
    function handleRowClick(e: MouseEvent) {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest("button, a, input, select, textarea")) return;
      const row = target.closest("tr");
      if (!row || !row.classList.contains(styles.expandableRow)) return;
      const key = row.getAttribute("data-key");
      if (!key) return;
      toggleExpanded(key);
    }
    container.addEventListener("click", handleRowClick);
    return () => container.removeEventListener("click", handleRowClick);
  });

  if (rows.length === 0) {
    if (isLoading) {
      return (
        <div
          className={clsx(styles.container, variantClassName, styles.loadingContainer, className)}
        >
          <ProgressCircle aria-label="Loading data..." />
        </div>
      );
    }
    return (
      <div className={clsx(styles.container, variantClassName, styles.loadingContainer, className)}>
        {emptyContent ?? null}
      </div>
    );
  }

  const displayRows: { row: T; detail: boolean; child: boolean }[] = expandable
    ? rows.flatMap((row) => {
        const entries: { row: T; detail: boolean; child: boolean }[] = [
          { row, detail: false, child: false },
        ];
        if (expanded.has(row.id)) {
          for (const child of getChildRows?.(row) ?? []) {
            entries.push({ row: child, detail: false, child: true });
          }
          if (renderExpandedContent) entries.push({ row, detail: true, child: false });
        }
        return entries;
      })
    : rows.map((row) => ({ row, detail: false, child: false }));

  return (
    <ResizableTableContainer
      ref={containerRef}
      onScroll={handleScroll}
      {...(isScrolled ? { "data-scrolled": true } : {})}
      className={clsx(styles.container, variantClassName, className)}
    >
      <Table
        aria-label="Data table"
        selectionMode={selectionMode}
        selectionBehavior={selectionBehavior}
        onSelectionChange={onSelectionChange}
        sortDescriptor={sortDescriptorProp ?? sortDescriptor}
        onSortChange={onSortChange ?? setSortDescriptor}
      >
        <TableHeader>
          {columns.map((col) => (
            <Column
              key={String(col.id)}
              id={String(col.id)}
              isRowHeader={col.isRowHeader}
              allowsSorting={col.allowsSorting}
              allowsResizing={col.allowsResizing}
            >
              {col.name}
            </Column>
          ))}
        </TableHeader>
        <TableBody renderEmptyState={emptyContent ? () => <>{emptyContent}</> : undefined}>
          <Collection items={displayRows} dependencies={collectionDependencies}>
            {(entry) =>
              entry.detail ? (
                <Row
                  key={`${entry.row.id}-details`}
                  id={`${entry.row.id}-details`}
                  columns={[{ id: "details" }]}
                  className={getRowClassName?.({ row: entry.row, detail: true, child: false })}
                >
                  {() => (
                    <Cell colSpan={columns.length}>
                      {renderExpandedContent ? renderExpandedContent(entry.row) : null}
                    </Cell>
                  )}
                </Row>
              ) : (
                <Row
                  key={entry.row.id}
                  id={entry.row.id}
                  columns={columns}
                  onAction={onRowAction ? () => onRowAction(entry.row.id) : undefined}
                  className={clsx(
                    expandOnRowClick && expandable && !entry.child
                      ? styles.expandableRow
                      : undefined,
                    getRowClassName?.({ row: entry.row, detail: false, child: entry.child }),
                  )}
                >
                  {(column: ColumnDef<T>) => {
                    const content = column.render
                      ? column.render(entry.row[column.id], entry.row)
                      : String(entry.row[column.id] ?? "");
                    if (
                      !expandable ||
                      entry.child ||
                      columns.indexOf(column) !== expandColumnIndex
                    ) {
                      return <Cell>{content}</Cell>;
                    }
                    const isExpanded = expanded.has(entry.row.id);
                    return (
                      <Cell>
                        <span className={styles.expandCell}>
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-label={expandLabel(entry.row)}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpanded(entry.row.id);
                            }}
                            className={tableStyles.chevronButton}
                          >
                            {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                          </button>
                          {content}
                        </span>
                      </Cell>
                    );
                  }}
                </Row>
              )
            }
          </Collection>
          {hasMore && (
            <TableLoadMoreItem onLoadMore={onLoadMore} isLoading={isLoading}>
              <span className={styles.loadMoreWrapper}>
                {loadMoreContent ?? <ProgressCircle aria-label="Loading..." />}
              </span>
            </TableLoadMoreItem>
          )}
        </TableBody>
      </Table>
    </ResizableTableContainer>
  );
}
