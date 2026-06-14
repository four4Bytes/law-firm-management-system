"use client";

import clsx from "clsx";
import { useCallback, useMemo, useRef, useState } from "react";
import { Collection, type Selection, type SortDescriptor } from "react-aria-components";

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
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  loadMoreContent?: React.ReactNode;
  emptyContent?: React.ReactNode;
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  sortDescriptor: externalSortDescriptor,
  onSortChange: externalOnSortChange,
  selectionMode = "none",
  selectionBehavior = "toggle",
  onSelectionChange,
  onLoadMore,
  hasMore,
  isLoading,
  loadMoreContent,
  emptyContent,
  className,
}: DataTableProps<T>) {
  const [internalSortDescriptor, setInternalSortDescriptor] = useState<
    SortDescriptor | undefined
  >();

  const sortDescriptor = externalSortDescriptor ?? internalSortDescriptor;
  const setSortDescriptor = externalOnSortChange ?? setInternalSortDescriptor;

  const sortedRows = useMemo(() => {
    if (!sortDescriptor?.column) return rows;
    const col = sortDescriptor.column as keyof T;
    return [...rows].sort((a, b) => {
      const aVal = a[col];
      const bVal = b[col];
      const aStr = aVal == null ? "" : String(aVal);
      const bStr = bVal == null ? "" : String(bVal);
      const cmp = aStr.localeCompare(bStr);
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [rows, sortDescriptor]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      setIsScrolled(el.scrollTop > 0);
    }
  }, []);

  return (
    <ResizableTableContainer
      ref={containerRef}
      onScroll={handleScroll}
      {...(isScrolled ? { "data-scrolled": true } : {})}
      className={clsx(styles.container, className)}
    >
      <Table
        aria-label="Data table"
        selectionMode={selectionMode}
        selectionBehavior={selectionBehavior}
        onSelectionChange={onSelectionChange}
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
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
          <Collection items={sortedRows}>
            {(item: T) => (
              <Row key={item.id} id={item.id} columns={columns}>
                {(column: ColumnDef<T>) => (
                  <Cell>
                    {column.render
                      ? column.render(item[column.id], item)
                      : String(item[column.id] ?? "")}
                  </Cell>
                )}
              </Row>
            )}
          </Collection>
          {hasMore && (
            <TableLoadMoreItem onLoadMore={onLoadMore} isLoading={isLoading}>
              {loadMoreContent ?? "Loading..."}
            </TableLoadMoreItem>
          )}
        </TableBody>
      </Table>
    </ResizableTableContainer>
  );
}
