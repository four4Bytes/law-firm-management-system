"use client";

import clsx from "clsx";

import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { getCasePaymentsPaginatedAction } from "@/features/cases/actions";
import type { PaymentRow } from "@/features/cases/queries";
import { formatDate } from "@/lib/date";

import tabStyles from "./Tab.module.css";

interface Props {
  caseId: string;
}

const statusClassMap: Record<string, string> = {
  Unpaid: tabStyles.statusPending,
  Partial: tabStyles.statusOngoing,
  Paid: tabStyles.statusDone,
  Refunded: tabStyles.statusCancelled,
};

const columns: ColumnDef<PaymentRow>[] = [
  {
    id: "amount",
    name: "Amount",
    isRowHeader: true,
    allowsSorting: true,
    render: (value) => `$${(value as number).toFixed(2)}`,
  },
  {
    id: "payment_date",
    name: "Date",
    allowsSorting: true,
    render: (value) => formatDate(value as Date),
  },
  { id: "payment_method", name: "Method" },
  { id: "receipt_number", name: "Receipt" },
  {
    id: "status",
    name: "Status",
    allowsSorting: true,
    render: (value) => {
      const s = value as string;
      return <span className={clsx(tabStyles.badge, statusClassMap[s])}>{s}</span>;
    },
  },
];

export function PaymentsTab({ caseId }: Props) {
  return (
    <ServerDataTable
      fetchAction={(p) => getCasePaymentsPaginatedAction({ caseId, ...p })}
      columns={columns}
      searchPlaceholder="Search payments..."
      emptyContent="No payments yet"
      loadingMessage="Loading payments..."
      searchLabel="Search payments"
      renderAddButton
      addButtonLabel="Add Payment"
    />
  );
}
