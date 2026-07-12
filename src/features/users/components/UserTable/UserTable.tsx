"use client";

import clsx from "clsx";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { type SortDescriptor } from "react-aria-components";
import { FaPenToSquare, FaPlus, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ProgressCircle } from "@/components/ui/ProgressCircle/ProgressCircle";
import { SearchField } from "@/components/ui/SearchField/SearchField";
import { queue } from "@/components/ui/Toast/Toast";
import { deactivateUserAction, getUsersPaginatedAction } from "@/features/users/actions";
import { UserFormModal } from "@/features/users/components/UserFormModal/UserFormModal";
import { roleLabels } from "@/features/users/constants";
import type { UserRow } from "@/features/users/queries";
import type { Role } from "@/generated/prisma/client";
import { toSortQuery } from "@/lib/sort";
import { useDebounce } from "@/lib/useDebounce";

import styles from "./UserTable.module.css";

interface UserTableProps {
  users?: UserRow[];
  sessionUserRole?: string;
}

const roleClassMap: Record<Role, string> = {
  Dev: styles.roleDev,
  Admin: styles.roleAdmin,
  BranchManager: styles.roleBranchManager,
  Lawyer: styles.roleLawyer,
  Paralegal: styles.roleParalegal,
  ProcessServer: styles.roleProcessServer,
};

export function UserTable({ users: staticUsers, sessionUserRole }: UserTableProps) {
  const canManage = sessionUserRole === "Admin" || sessionUserRole === "Dev";
  const [items, setItems] = useState<UserRow[]>(staticUsers ?? []);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(staticUsers === undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  type ModalTarget = { type: "add" } | { type: "edit"; user: UserRow } | null;

  const [search, setSearch] = useState("");
  const [modalTarget, setModalTarget] = useState<ModalTarget>(null);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor | undefined>();
  const [isPending, startTransition] = useTransition();

  const isLoading = isPending || isLoadingMore;
  const useServerFetch = staticUsers === undefined;

  const debouncedSearch = useDebounce(search, 300);
  const generationRef = useRef(0);

  useEffect(() => {
    if (!useServerFetch) return;

    let cancelled = false;
    ++generationRef.current;

    startTransition(async () => {
      try {
        const sort = toSortQuery(sortDescriptor);
        const result = await getUsersPaginatedAction({
          search: debouncedSearch,
          sort,
          pageSize: 10,
        });
        if (cancelled) return;
        setItems(result.users);
        setCursor(result.nextCursor);
        setHasMore(result.nextCursor !== null);
        setIsInitialLoad(false);
      } catch {
        if (cancelled) return;
        setIsInitialLoad(false);
        queue.add({
          title: "Failed to load users",
          description: "Could not retrieve the user list. Please try again.",
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, sortDescriptor, startTransition, useServerFetch, refreshKey]);

  const handleLoadMore = useCallback(async () => {
    if (!useServerFetch || isLoading || !hasMore || !cursor) return;

    const gen = generationRef.current;
    setIsLoadingMore(true);

    try {
      const sort = toSortQuery(sortDescriptor);
      const result = await getUsersPaginatedAction({
        search: debouncedSearch,
        cursor,
        sort,
        pageSize: 10,
      });
      if (gen !== generationRef.current) return;
      setItems((prev) => [...prev, ...result.users]);
      setCursor(result.nextCursor);
      setHasMore(result.nextCursor !== null);
    } catch {
      queue.add({
        title: "Failed to load more users",
        description: "Could not retrieve additional items. Please try again.",
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [useServerFetch, isLoading, hasMore, cursor, debouncedSearch, sortDescriptor]);

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
    ...(canManage
      ? [
          {
            id: "is_active" as const,
            name: "Action" as const,
            render: (_value: unknown, row: unknown) => {
              const user = row as UserRow;
              return (
                <div className={styles.actions}>
                  {user.role !== "Dev" && (
                    <Button
                      variant="ghost"
                      aria-label={`Edit ${user.name}`}
                      onPress={() => setModalTarget({ type: "edit", user })}
                    >
                      <FaPenToSquare className={styles.icon} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    aria-label={`Deactivate ${user.name}`}
                    onPress={() => setDeletingUser(user)}
                  >
                    <FaTrashCan className={styles.icon} />
                  </Button>
                </div>
              );
            },
          } as ColumnDef<UserRow>,
        ]
      : []),
  ];

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
        {canManage && (
          <Button
            variant="secondary"
            className={styles.addButton}
            aria-label="Add user"
            onPress={() => setModalTarget({ type: "add" })}
          >
            <FaPlus /> Add User
          </Button>
        )}
      </div>
      {isInitialLoad ? (
        <div className={styles.loadingContainer}>
          <ProgressCircle aria-label="Loading users..." />
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={items}
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          isLoading={isLoading}
          emptyContent={emptyContent}
        />
      )}
      <UserFormModal
        mode={modalTarget?.type ?? "add"}
        user={modalTarget?.type === "edit" ? modalTarget.user : undefined}
        isOpen={modalTarget !== null}
        onOpenChange={(open) => {
          if (!open) setModalTarget(null);
        }}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      <ConfirmDialog
        isOpen={!!deletingUser}
        onOpenChange={(open) => {
          if (!open) setDeletingUser(null);
        }}
        title="Deactivate User"
        confirmLabel="Deactivate"
        onConfirm={async () => {
          if (!deletingUser) return;
          const result = await deactivateUserAction({ userId: deletingUser.id });
          if (result.error) {
            queue.add({ title: result.error });
            return;
          }
          setDeletingUser(null);
          setRefreshKey((k) => k + 1);
          queue.add(
            { title: "User deactivated", description: deletingUser.email },
            { timeout: 5000 },
          );
        }}
      >
        Are you sure you want to deactivate{" "}
        <strong>{deletingUser?.name ?? deletingUser?.email}</strong>? They won&apos;t be able to
        sign in.
      </ConfirmDialog>
    </div>
  );
}
