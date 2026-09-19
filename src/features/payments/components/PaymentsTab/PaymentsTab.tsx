"use client";

import { useState } from "react";
import { FaPenToSquare, FaTrashCan } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";
import { type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/StatusBadge/StatusBadge";
import { Tooltip, TooltipTrigger } from "@/components/ui/Tooltip/Tooltip";
import {
  deletePaymentAction,
  getPaymentRowByIdAction,
  getPaymentsPaginatedAction,
} from "@/features/payments/actions";
import { AddPaymentModal } from "@/features/payments/components/AddPaymentModal/AddPaymentModal";
import { EditPaymentModal } from "@/features/payments/components/EditPaymentModal/EditPaymentModal";
import type { PaymentRow } from "@/features/payments/queries";
import { PaymentStatus } from "@/generated/prisma/browser";
import { formatDate } from "@/lib/date";
import { toastActionError, toastError, toastSuccess } from "@/lib/toast-utils";
import { usePendingFetch } from "@/lib/usePendingFetch";

import styles from "./PaymentsTab.module.css";

interface Props {
  caseId?: string;
  consultationId?: string;
}

const statusClassMap: Record<PaymentStatus, StatusBadgeVariant> = {
  Unpaid: "pending",
  Partial: "warning",
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
  const [deleteTarget, setDeleteTarget] = useState<PaymentRow | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const {
    pendingId: pendingEditId,
    run: runEditFetch,
    clear: clearPendingFetch,
  } = usePendingFetch();

  function handleRefresh() {
    setRefreshTrigger((n) => n + 1);
  }

  async function handleEdit(payment: PaymentRow) {
    try {
      const data = await runEditFetch(payment.id, () => getPaymentRowByIdAction(payment.id));
      if (!data) return;
      setEditPayment(data);
    } catch {
      toastError("Failed to load payment", "Please try again in a moment.");
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deletePaymentAction({ paymentId: deleteTarget.id });
    if (result.success) {
      setDeleteTarget(null);
      handleRefresh();
      toastSuccess("Payment deleted", "The payment has been deleted.");
    } else {
      toastActionError(result, "delete payment");
    }
  }

  const actionColumn: ColumnDef<PaymentRow> = {
    id: "id" as const,
    name: "Action" as const,
    render: (_value: unknown, row: unknown) => {
      const payment = row as PaymentRow;
      return (
        <div className={styles.actions}>
          <TooltipTrigger>
            <Button
              variant="ghost"
              aria-label="Edit payment"
              onPress={() => handleEdit(payment)}
              isPending={pendingEditId === payment.id}
            >
              <FaPenToSquare className={styles.icon} />
            </Button>
            <Tooltip>Edit payment</Tooltip>
          </TooltipTrigger>
          <TooltipTrigger>
            <Button
              variant="ghost"
              aria-label="Delete payment"
              onPress={() => {
                clearPendingFetch();
                setDeleteTarget(payment);
              }}
            >
              <FaTrashCan className={styles.icon} />
            </Button>
            <Tooltip>Delete payment</Tooltip>
          </TooltipTrigger>
        </div>
      );
    },
  };

  return (
    <>
      <ServerDataTable
        fetchAction={(p) => getPaymentsPaginatedAction({ caseId, consultationId, ...p })}
        columns={[...columns, actionColumn]}
        searchPlaceholder="Search payments..."
        emptyContent="No payments yet"
        loadingMessage="Loading payments..."
        searchLabel="Search payments"
        selectionMode="none"
        collectionDependencies={[pendingEditId]}
        renderAddButton
        addButtonLabel="Add Payment"
        onAddButtonPress={() => setIsAddOpen(true)}
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

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Payment"
        confirmLabel="Delete"
        onConfirm={handleDelete}
      >
        Are you sure you want to delete this payment? This action cannot be undone.
      </ConfirmDialog>
    </>
  );
}
