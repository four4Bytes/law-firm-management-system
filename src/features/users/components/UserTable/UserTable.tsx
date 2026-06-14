"use client";

import clsx from "clsx";
import { useCallback, useEffect, useState, useTransition } from "react";
import { FaPenToSquare, FaPlus, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { SearchField } from "@/components/ui/SearchField/SearchField";
import { getUsersPaginatedAction } from "@/features/users/actions";
import { AddUserModal } from "@/features/users/components/AddUserModal/AddUserModal";
import { roleLabels } from "@/features/users/constants";
import type { Role } from "@/generated/prisma/client";
import { useDebounce } from "@/lib/useDebounce";

import styles from "./UserTable.module.css";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role | null;
  is_active: boolean;
  created_at: Date;
}

interface UserTableProps {
  users?: UserRow[];
}

const roleClassMap: Record<Role, string> = {
  Dev: styles.roleDev,
  Admin: styles.roleAdmin,
  BranchManager: styles.roleBranchManager,
  Lawyer: styles.roleLawyer,
  Paralegal: styles.roleParalegal,
  ProcessServer: styles.roleProcessServer,
};

const columns: ColumnDef<UserRow>[] = [
  {
    id: "name",
    name: "Name",
    isRowHeader: true,
    allowsSorting: true,
  },
  {
    id: "email",
    name: "Email",
    allowsSorting: true,
  },
  {
    id: "role",
    name: "Role",
    allowsSorting: true,
    render: (value) => {
      const role = value as Role | null;
      if (!role) return null;
      return (
        <span className={clsx(styles.roleBadge, roleClassMap[role])}>
          {roleLabels[role] ?? role}
        </span>
      );
    },
  },
  {
    id: "is_active",
    name: "Action",
    render: () => (
      <div className={styles.actions}>
        <Button variant="ghost" aria-label="Edit user">
          <FaPenToSquare className={styles.icon} />
        </Button>
        <Button variant="ghost" aria-label="Delete user">
          <FaTrashCan className={styles.icon} />
        </Button>
      </div>
    ),
  },
];

export function UserTable({ users: staticUsers }: UserTableProps) {
  const [items, setItems] = useState<UserRow[]>(staticUsers ?? []);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [search, setSearch] = useState("");
  const [isAddOpen, setAddOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  const isLoading = isPending || isLoadingMore;
  const useServerFetch = staticUsers === undefined;

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (!useServerFetch) return;

    let cancelled = false;

    startTransition(async () => {
      const result = await getUsersPaginatedAction({ search: debouncedSearch, pageSize: 10 });
      if (cancelled) return;
      setItems(result.users);
      setCursor(result.nextCursor);
      setHasMore(result.nextCursor !== null);
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, startTransition, useServerFetch, refreshKey]);

  const handleLoadMore = useCallback(async () => {
    if (!useServerFetch || isLoading || !hasMore || !cursor) return;

    setIsLoadingMore(true);

    try {
      const result = await getUsersPaginatedAction({
        search: debouncedSearch,
        cursor,
        pageSize: 10,
      });
      setItems((prev) => [...prev, ...result.users]);
      setCursor(result.nextCursor);
      setHasMore(result.nextCursor !== null);
    } finally {
      setIsLoadingMore(false);
    }
  }, [useServerFetch, isLoading, hasMore, cursor, debouncedSearch]);

  const emptyContent =
    debouncedSearch && items.length === 0 && !isLoading
      ? `No users matching "${debouncedSearch}"`
      : !debouncedSearch && items.length === 0 && !isLoading
        ? "No users yet"
        : undefined;

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search users..."
            aria-label="Search users"
          />
        </div>
        <Button
          variant="secondary"
          className={styles.addButton}
          aria-label="Add user"
          onPress={() => setAddOpen(true)}
        >
          <FaPlus /> Add User
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
      <AddUserModal
        isOpen={isAddOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
