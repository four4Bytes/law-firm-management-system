"use client";

import clsx from "clsx";
import { useState } from "react";
import { FaPenToSquare, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { queue } from "@/components/ui/Toast/Toast";
import { logoutUser } from "@/features/auth/actions";
import { deactivateUserAction, getUsersPaginatedAction } from "@/features/users/actions";
import { UserFormModal } from "@/features/users/components/UserFormModal/UserFormModal";
import { roleLabels } from "@/features/users/constants";
import type { UserRow } from "@/features/users/queries";
import type { Role } from "@/generated/prisma/client";

import styles from "./UserTable.module.css";

interface UserTableProps {
  users?: UserRow[];
  initialCursor?: string | null;
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

export function UserTable({ users, initialCursor, sessionUserRole }: UserTableProps) {
  const canManage = sessionUserRole === "Admin" || sessionUserRole === "Dev";
  type ModalTarget = { type: "add" } | { type: "edit"; user: UserRow } | null;

  const [modalTarget, setModalTarget] = useState<ModalTarget>(null);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  return (
    <div className={styles.wrapper}>
      <ServerDataTable
        fetchAction={async (p) => {
          const result = await getUsersPaginatedAction(p);
          return { rows: result.users, nextCursor: result.nextCursor };
        }}
        columns={columns}
        initialRows={users}
        initialCursor={initialCursor}
        searchPlaceholder="Search users..."
        emptyContent="No users yet"
        loadingMessage="Loading users..."
        searchLabel="Search users"
        selectionMode="none"
        renderAddButton={canManage}
        addButtonLabel="Add User"
        onAddButtonPress={() => setModalTarget({ type: "add" })}
        refreshTrigger={refreshTrigger}
      />

      <UserFormModal
        mode={modalTarget?.type ?? "add"}
        user={modalTarget?.type === "edit" ? modalTarget.user : undefined}
        isOpen={modalTarget !== null}
        onOpenChange={(open) => {
          if (!open) setModalTarget(null);
        }}
        onSuccess={() => setRefreshTrigger((t) => t + 1)}
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
          if (result.data?.selfDeactivated) {
            await logoutUser("deactivated");
            return;
          }
          setDeletingUser(null);
          setRefreshTrigger((t) => t + 1);
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
