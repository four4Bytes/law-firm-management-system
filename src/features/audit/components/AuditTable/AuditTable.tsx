"use client";

import { FaArrowUpRightFromSquare } from "react-icons/fa6";

import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { Link } from "@/components/ui/Link/Link";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { getAuditLogAction } from "@/features/audit/actions";
import type { AuditLogRow } from "@/features/audit/queries";
import { formatDateTime } from "@/lib/date";

import styles from "./AuditTable.module.css";

const entityConfig: Record<string, { label: string; href?: (id: string) => string }> = {
  Case: { label: "Case", href: (id) => `/case/${id}` },
  Consultation: { label: "Consultation", href: (id) => `/consultation/${id}` },
  User: { label: "User" },
  Client: { label: "Client" },
};

const columns: ColumnDef<AuditLogRow>[] = [
  { id: "created_at", name: "Timestamp", render: (value) => formatDateTime(value as Date) },
  { id: "action", name: "Action", isRowHeader: true },
  { id: "actor", name: "Actor" },
  {
    id: "entityType",
    name: "Entity",
    render: (value, row) => {
      const type = value as string;
      const config = entityConfig[type];
      if (!config) return type;
      if (!config.href) return config.label;
      const r = row as AuditLogRow;
      if (!r.entityExists) {
        return <span className={styles.deleted}>{config.label} (Deleted)</span>;
      }
      return (
        <Link href={config.href(r.entityId)} className={styles.entityLink}>
          {config.label}
          <FaArrowUpRightFromSquare className={styles.linkIcon} />
        </Link>
      );
    },
  },
  { id: "details", name: "Details" },
];

export function AuditTable() {
  return (
    <ServerDataTable
      fetchAction={getAuditLogAction}
      columns={columns}
      searchPlaceholder="Search activity..."
      emptyContent="No activity yet"
      loadingMessage="Loading activity log..."
      searchLabel="Search activity"
      selectionMode="none"
    />
  );
}
