"use client";

import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { getEntityActivityLogAction } from "@/features/audit/actions";
import type { AuditLogRow } from "@/features/audit/queries";
import { formatDateTime } from "@/lib/date";

interface Props {
  entityType: "Case" | "Consultation";
  entityId: string;
}

const columns: ColumnDef<AuditLogRow>[] = [
  { id: "action", name: "Action", isRowHeader: true },
  { id: "actor", name: "Actor" },
  { id: "details", name: "Details" },
  { id: "created_at", name: "Timestamp", render: (value) => formatDateTime(value as Date) },
];

export function ActivityLogTab({ entityType, entityId }: Props) {
  return (
    <ServerDataTable
      fetchAction={(p) => getEntityActivityLogAction({ entityType, entityId, ...p })}
      columns={columns}
      searchPlaceholder="Search activity..."
      emptyContent="No activity yet"
      loadingMessage="Loading activity log..."
      searchLabel="Search activity"
      selectionMode="none"
    />
  );
}
