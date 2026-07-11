"use server";

import { revalidatePath } from "next/cache";

import type { ActionDataResponse, ActionStatusResponse } from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";
import { getParentPath } from "@/lib/path";

import { createPayment, deletePayment, updatePayment } from "./mutations";
import { getPaymentById, getPaymentRowById, type PaymentRow } from "./queries";
import { PaymentCreatePayloadSchema, PaymentIdSchema, PaymentUpdatePayloadSchema } from "./schemas";

export async function getPaymentRowByIdAction(paymentId: string): Promise<PaymentRow | null> {
  await requireAuth();

  const parsed = PaymentIdSchema.safeParse({ paymentId });
  if (!parsed.success) {
    throw new Error("Invalid payment ID");
  }

  return getPaymentRowById(parsed.data.paymentId);
}

export async function createPaymentAction(
  payload: unknown,
): Promise<ActionDataResponse<{ id: string }>> {
  const session = await requireAuth();

  const parsed = PaymentCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid payment data" };
  }

  const { amount, payment_date, status, payment_method, receipt_number, case_id, consultation_id } =
    parsed.data;

  try {
    const payment = await createPayment({
      amount,
      payment_date,
      status,
      payment_method: payment_method || null,
      receipt_number: receipt_number || null,
      case_id: case_id ?? null,
      consultation_id: consultation_id ?? null,
      created_by_user_id: session.id,
    });

    revalidatePath(case_id ? `/case/${case_id}` : `/consultation/${consultation_id}`);

    return { success: true, data: { id: payment.id } };
  } catch {
    return { success: false, error: "Failed to create payment" };
  }
}

export async function updatePaymentAction(payload: unknown): Promise<ActionStatusResponse> {
  await requireAuth();

  const parsed = PaymentUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid payment data" };
  }

  const { paymentId, amount, payment_date, status, payment_method, receipt_number } = parsed.data;

  try {
    const existing = await getPaymentById(paymentId);
    if (!existing) return { success: false, error: "Payment not found" };

    await updatePayment(paymentId, {
      amount,
      payment_date,
      status,
      payment_method: payment_method || null,
      receipt_number: receipt_number || null,
    });

    revalidatePath(getParentPath(existing));

    return { success: true };
  } catch {
    return { success: false, error: "Failed to update payment" };
  }
}

export async function deletePaymentAction(paymentId: string): Promise<ActionStatusResponse> {
  await requireAuth();

  const parsed = PaymentIdSchema.safeParse({ paymentId });
  if (!parsed.success) {
    return { success: false, error: "Invalid payment ID" };
  }

  try {
    const existing = await getPaymentById(paymentId);
    if (!existing) return { success: false, error: "Payment not found" };

    await deletePayment(paymentId);

    revalidatePath(getParentPath(existing));

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete payment" };
  }
}
