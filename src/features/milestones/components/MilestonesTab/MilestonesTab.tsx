"use client";

import { useState } from "react";
import { FaPenToSquare, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/StatusBadge/StatusBadge";
import type { FilterDefinition } from "@/components/ui/TableFilter/TableFilter";
import { Tooltip, TooltipTrigger } from "@/components/ui/Tooltip/Tooltip";
import {
  deleteMilestoneAction,
  getMilestoneRowByIdAction,
  getMilestonesPaginatedAction,
} from "@/features/milestones/actions";
import { AddMilestoneModal } from "@/features/milestones/components/AddMilestoneModal/AddMilestoneModal";
import { EditMilestoneModal } from "@/features/milestones/components/EditMilestoneModal/EditMilestoneModal";
import type { MilestoneListRow, MilestoneRow } from "@/features/milestones/queries";
import { CaseMilestoneStatus, type Role } from "@/generated/prisma/browser";
import { formatDateTime, isBeforeToday } from "@/lib/date";
import { can, type AccessContext } from "@/lib/rbac";
import {
  toastActionError,
  toastDenied,
  toastError,
  toastNotFound,
  toastSuccess,
} from "@/lib/toast-utils";
import { usePendingFetch } from "@/lib/usePendingFetch";

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

const milestoneFilters: FilterDefinition[] = [
  {
    key: "status",
    label: "Status",
    options: Object.values(CaseMilestoneStatus).map((status) => ({
      value: status,
      label: status,
    })),
  },
];

const columns: ColumnDef<MilestoneListRow>[] = [
  { id: "title", name: "Title", isRowHeader: true, allowsSorting: true },
  {
    id: "description",
    name: "Description",
    render: (value) => (value ? (value as string) : "—"),
  },
  {
    id: "due_date",
    name: "Due Date",
    allowsSorting: true,
    render: (value, row) => {
      const date = value as Date;
      const isOverdue = row.status === CaseMilestoneStatus.Pending && isBeforeToday(date);
      return (
        <span className={styles.dateCell}>
          {formatDateTime(date)}
          {isOverdue && <span className={styles.overdue}>Overdue</span>}
        </span>
      );
    },
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
  const [deleteTarget, setDeleteTarget] = useState<MilestoneListRow | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const {
    pendingId: pendingEditId,
    run: runEditFetch,
    clear: clearPendingFetch,
  } = usePendingFetch();

  const canCreate = can(userRole, "milestone.create", access);

  function handleRefresh() {
    setRefreshTrigger((n) => n + 1);
  }

  async function handleEdit(milestone: MilestoneListRow) {
    try {
      const data = await runEditFetch(milestone.id, () => getMilestoneRowByIdAction(milestone.id));
      if (!data) return;
      if (!data.row) {
        toastNotFound("Milestone");
        return;
      }
      if (!data.canUpdate) {
        toastDenied();
        return;
      }
      setEditMilestone(data.row);
    } catch {
      toastError("Failed to load milestone", "Please try again in a moment.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteMilestoneAction({ milestoneId: deleteTarget.id });
    if (result.success) {
      setDeleteTarget(null);
      handleRefresh();
      toastSuccess("Milestone deleted", "The milestone has been deleted.");
    } else {
      toastActionError(result, "delete milestone");
    }
  }

  const actionColumn: ColumnDef<MilestoneListRow> = {
    id: "id" as const,
    name: "Action" as const,
    render: (_value: unknown, row: unknown) => {
      const milestone = row as MilestoneListRow;
      return (
        <div className={styles.actions}>
          <TooltipTrigger>
            <Button
              variant="ghost"
              aria-label="Edit milestone"
              onPress={() => handleEdit(milestone)}
              isPending={pendingEditId === milestone.id}
            >
              <FaPenToSquare className={styles.icon} />
            </Button>
            <Tooltip>Edit milestone</Tooltip>
          </TooltipTrigger>
          <TooltipTrigger>
            <Button
              variant="ghost"
              aria-label="Delete milestone"
              onPress={() => {
                clearPendingFetch();
                setDeleteTarget(milestone);
              }}
            >
              <FaTrashCan className={styles.icon} />
            </Button>
            <Tooltip>Delete milestone</Tooltip>
          </TooltipTrigger>
        </div>
      );
    },
  };

  return (
    <>
      <ServerDataTable
        fetchAction={(p) => getMilestonesPaginatedAction({ caseId, ...p })}
        columns={[...columns, actionColumn]}
        searchPlaceholder="Search milestones..."
        emptyContent="No milestones yet"
        loadingMessage="Loading milestones..."
        searchLabel="Search milestones"
        filters={milestoneFilters}
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
