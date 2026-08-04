"use client";

import { useRef, useState } from "react";

import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/StatusBadge/StatusBadge";
import { queue } from "@/components/ui/Toast/Toast";
import { getPaymentRowByIdAction, getPaymentsPaginatedAction } from "@/features/payments/actions";
import { AddPaymentModal } from "@/features/payments/components/AddPaymentModal/AddPaymentModal";
import { EditPaymentModal } from "@/features/payments/components/EditPaymentModal/EditPaymentModal";
import type { PaymentRow } from "@/features/payments/queries";
import { PaymentStatus } from "@/generated/prisma/browser";
import { formatDate } from "@/lib/date";

interface Props {
  caseId?: string;
  consultationId?: string;
}

const statusClassMap: Record<PaymentStatus, StatusBadgeVariant> = {
  Unpaid: "pending",
  Partial: "ongoing",
  Paid: "done",
  Refunded: "cancelled",
};

const columns: ColumnDef<PaymentRow>[] = [
  {
    id: "amount",
    name: "Amount",
    isRowHeader: true,
    allowsSorting: true,
    render: (value) => `₱${(value as number).toFixed(2)}`,
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
    render: (value) => (
      <StatusBadge variant={statusClassMap[value as PaymentStatus]}>{value as string}</StatusBadge>
    ),
  },
];

export function PaymentsTab({ caseId, consultationId }: Props) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<PaymentRow | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const latestRequest = useRef(0);

  function handleRefresh() {
    setRefreshTrigger((n) => n + 1);
  }

  async function handleRowAction(id: string) {
    const requestId = ++latestRequest.current;
    try {
      const data = await getPaymentRowByIdAction(id);
      if (requestId !== latestRequest.current) return;
      if (data) {
        setEditPayment(data);
      } else {
        queue.add({ title: "Payment not found" }, { timeout: 5000 });
      }
    } catch {
      if (requestId !== latestRequest.current) return;
      queue.add({ title: "Failed to load payment" }, { timeout: 5000 });
    }
  }

  return (
    <>
      <ServerDataTable
        fetchAction={(p) => getPaymentsPaginatedAction({ caseId, consultationId, ...p })}
        columns={columns}
        searchPlaceholder="Search payments..."
        emptyContent="No payments yet"
        loadingMessage="Loading payments..."
        searchLabel="Search payments"
        renderAddButton
        addButtonLabel="Add Payment"
        onAddButtonPress={() => setIsAddOpen(true)}
        onRowAction={handleRowAction}
        refreshTrigger={refreshTrigger}
      />

      <AddPaymentModal
        isOpen={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={handleRefresh}
        caseId={caseId}
        consultationId={consultationId}
      />

      {editPayment && (
        <EditPaymentModal
          key={editPayment.id}
          isOpen={!!editPayment}
          onOpenChange={() => setEditPayment(null)}
          onSuccess={handleRefresh}
          payment={editPayment}
        />
      )}
    </>
  );
}
