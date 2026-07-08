"use client";

import clsx from "clsx";
import { useCallback, useRef, useState } from "react";
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
  className?: string;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  sortDescriptor,
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
  className,
}: DataTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      setIsScrolled(el.scrollTop > 0);
    }
  }, []);

  if (rows.length === 0) {
    if (isLoading) {
      return (
        <div className={clsx(styles.container, styles.loadingContainer, className)}>
          <ProgressCircle aria-label="Loading data..." />
        </div>
      );
    }
    return (
      <div className={clsx(styles.container, styles.loadingContainer, className)}>
        {emptyContent ?? null}
      </div>
    );
  }

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
        onSortChange={onSortChange}
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
          <Collection items={rows}>
            {(item: T) => (
              <Row
                key={item.id}
                id={item.id}
                columns={columns}
                onAction={onRowAction ? () => onRowAction(item.id) : undefined}
              >
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
