"use client";

import clsx from "clsx";

import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { getConsultationPaymentsPaginatedAction } from "@/features/consultations/actions";
import type { PaymentRow } from "@/features/consultations/queries";
import { formatDate } from "@/lib/date";

import tabStyles from "./Tab.module.css";

interface Props {
  consultationId: string;
}

const statusClassMap: Record<string, string> = {
  Unpaid: tabStyles.statusPending,
  Partial: tabStyles.statusInfo,
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
      const status = value as string;
      return <span className={clsx(tabStyles.badge, statusClassMap[status])}>{status}</span>;
    },
  },
];

export function PaymentsTab({ consultationId }: Props) {
  return (
    <ServerDataTable
      fetchAction={(p) => getConsultationPaymentsPaginatedAction({ consultationId, ...p })}
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
