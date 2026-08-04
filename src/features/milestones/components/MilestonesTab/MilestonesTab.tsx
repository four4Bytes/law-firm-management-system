"use client";

import { useRef, useState } from "react";
import { FaPenToSquare, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/StatusBadge/StatusBadge";
import { queue } from "@/components/ui/Toast/Toast";
import { getCaseMilestonesPaginatedAction } from "@/features/cases/actions";
import type { CaseMilestoneListRow } from "@/features/cases/queries";
import { deleteMilestoneAction, getMilestoneRowByIdAction } from "@/features/milestones/actions";
import { AddMilestoneModal } from "@/features/milestones/components/AddMilestoneModal/AddMilestoneModal";
import { EditMilestoneModal } from "@/features/milestones/components/EditMilestoneModal/EditMilestoneModal";
import type { MilestoneRow } from "@/features/milestones/queries";
import { CaseMilestoneStatus, type Role } from "@/generated/prisma/browser";
import { formatDate } from "@/lib/date";
import { can, type AccessContext } from "@/lib/rbac";

import styles from "./MilestonesTab.module.css";

interface Props {
  caseId: string;
  access: AccessContext;
  userRole: Role | null;
}

const statusClassMap: Record<CaseMilestoneStatus, StatusBadgeVariant> = {
  Pending: "pending",
  Done: "done",
  Cancelled: "cancelled",
};

const columns: ColumnDef<CaseMilestoneListRow>[] = [
  { id: "title", name: "Title", isRowHeader: true, allowsSorting: true },
  {
    id: "due_date",
    name: "Due Date",
    allowsSorting: true,
    render: (value) => formatDate(value as Date),
  },
  {
    id: "status",
    name: "Status",
    allowsSorting: true,
    render: (value) => (
      <StatusBadge variant={statusClassMap[value as CaseMilestoneStatus]}>
        {value as string}
      </StatusBadge>
    ),
  },
];

export function MilestonesTab({ caseId, access, userRole }: Props) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editMilestone, setEditMilestone] = useState<MilestoneRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CaseMilestoneListRow | null>(null);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const latestRequest = useRef(0);

  const canCreate = can(userRole, "milestone.create", access);

  function handleRefresh() {
    setRefreshTrigger((n) => n + 1);
  }

  async function handleEdit(milestone: CaseMilestoneListRow) {
    const requestId = ++latestRequest.current;
    setPendingEditId(milestone.id);
    try {
      const data = await getMilestoneRowByIdAction(milestone.id);
      if (requestId !== latestRequest.current) return;
      if (!data.row) {
        queue.add({ title: "Milestone not found" }, { timeout: 5000 });
        return;
      }
      if (!data.canUpdate) {
        queue.add(
          { title: "You don't have permission to edit this milestone." },
          { timeout: 5000 },
        );
        return;
      }
      setEditMilestone(data.row);
    } catch {
      if (requestId !== latestRequest.current) return;
      queue.add({ title: "Failed to load milestone" }, { timeout: 5000 });
    } finally {
      if (requestId === latestRequest.current) setPendingEditId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteMilestoneAction({ milestoneId: deleteTarget.id });
    if (result.success) {
      setDeleteTarget(null);
      handleRefresh();
      queue.add({ title: "Milestone deleted" }, { timeout: 5000 });
    } else {
      queue.add({ title: result.error ?? "Failed to delete milestone" }, { timeout: 5000 });
    }
  }

  const actionColumn: ColumnDef<CaseMilestoneListRow> = {
    id: "id" as const,
    name: "Action" as const,
    render: (_value: unknown, row: unknown) => {
      const milestone = row as CaseMilestoneListRow;
      return (
        <div className={styles.actions}>
          <Button
            variant="ghost"
            aria-label="Edit milestone"
            onPress={() => handleEdit(milestone)}
            isPending={pendingEditId === milestone.id}
          >
            <FaPenToSquare className={styles.icon} />
          </Button>
          <Button
            variant="ghost"
            aria-label="Delete milestone"
            onPress={() => setDeleteTarget(milestone)}
          >
            <FaTrashCan className={styles.icon} />
          </Button>
        </div>
      );
    },
  };

  return (
    <>
      <ServerDataTable
        fetchAction={(p) => getCaseMilestonesPaginatedAction({ caseId, ...p })}
        columns={[...columns, actionColumn]}
        searchPlaceholder="Search milestones..."
        emptyContent="No milestones yet"
        loadingMessage="Loading milestones..."
        searchLabel="Search milestones"
        selectionMode="none"
        collectionDependencies={[pendingEditId]}
        renderAddButton={canCreate}
        addButtonLabel="Add Milestone"
        onAddButtonPress={() => setIsAddOpen(true)}
        refreshTrigger={refreshTrigger}
      />

      <AddMilestoneModal
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={handleRefresh}
        caseId={caseId}
      />

      {editMilestone && (
        <EditMilestoneModal
          key={editMilestone.id}
          isOpen={!!editMilestone}
          onOpenChange={() => setEditMilestone(null)}
          onSuccess={handleRefresh}
          milestone={editMilestone}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Milestone"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      >
        Are you sure you want to delete this milestone? This action cannot be undone.
      </ConfirmDialog>
    </>
  );
}
