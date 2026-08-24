"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { logAudit } from "@/features/audit/mutations";
import { getCaseAccessContext } from "@/features/cases/queries";
import { getConsultationAccessContext } from "@/features/consultations/queries";
import {
  actionForbidden,
  actionInvalid,
  actionNotFound,
  type ActionDataResponse,
  type ActionStatusResponse,
} from "@/lib/action-response";
import { requirePermission, requirePermissionOrNull } from "@/lib/auth-guards";
import { toActionResponse } from "@/lib/errors";
import { getParentPath } from "@/lib/path";
import { can } from "@/lib/rbac";

import { createPayment, deletePayment, updatePayment } from "./mutations";
import {
  getPaymentAccessContext,
  getPaymentById,
  getPaymentRowById,
  getPaymentsPaginated,
  type PaymentRow,
} from "./queries";
import {
  PaymentCreatePayloadSchema,
  PaymentIdSchema,
  PaymentPageQuerySchema,
  PaymentUpdatePayloadSchema,
} from "./schemas";

export async function getPaymentRowByIdAction(paymentId: string): Promise<PaymentRow | null> {
  await requirePermission("payment.read");

  const parsed = PaymentIdSchema.safeParse({ paymentId });
  if (!parsed.success) {
    throw new Error("Invalid payment ID");
  }

  return getPaymentRowById(parsed.data.paymentId);
}

export async function getPaymentsPaginatedAction(
  params: z.input<typeof PaymentPageQuerySchema>,
): Promise<{
  rows: PaymentRow[];
  nextCursor: string | null;
}> {
  await requirePermission("payment.read");

  const parsed = PaymentPageQuerySchema.safeParse(params);
  if (!parsed.success) {
    throw new Error("Invalid query parameters");
  }

  return getPaymentsPaginated(parsed.data);
}

export async function createPaymentAction(
  payload: z.input<typeof PaymentCreatePayloadSchema>,
): Promise<ActionDataResponse<{ id: string }>> {
  const session = await requirePermissionOrNull("payment.create");
  if (!session) return actionForbidden();

  const parsed = PaymentCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("payment");

  const { amount, payment_date, status, payment_method, receipt_number, case_id, consultation_id } =
    parsed.data;

  try {
    // Check access to parent case or consultation
    const parentAccess = case_id
      ? await getCaseAccessContext(session.id, case_id)
      : consultation_id
        ? await getConsultationAccessContext(session.id, consultation_id)
        : null;

    if (!parentAccess || !can(session.role, "payment.create", parentAccess)) {
      return actionForbidden();
    }

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

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "payment.created",
        entityType: case_id ? "Case" : "Consultation",
        entityId: (case_id ?? consultation_id)!,
        details: `Created payment: ₱${Number(amount).toFixed(2)}`,
      }),
    );

    revalidatePath(case_id ? `/case/${case_id}` : `/consultation/${consultation_id}`);

    return { success: true, data: { id: payment.id } };
  } catch (error) {
    return toActionResponse(error, "create payment");
  }
}

export async function updatePaymentAction(
  payload: z.input<typeof PaymentUpdatePayloadSchema>,
): Promise<ActionStatusResponse> {
  const session = await requirePermissionOrNull("payment.update");
  if (!session) return actionForbidden();

  const parsed = PaymentUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("payment");

  const { paymentId, amount, payment_date, status, payment_method, receipt_number } = parsed.data;

  try {
    const existing = await getPaymentById(paymentId);
    if (!existing) return actionNotFound("Payment");

    const access = await getPaymentAccessContext(session.id, paymentId);
    if (!can(session.role, "payment.update", access)) {
      return actionForbidden();
    }

    if (
      Number(existing.amount) === amount &&
      existing.payment_date.getTime() === payment_date.getTime() &&
      existing.status === status &&
      existing.payment_method === (payment_method || null) &&
      existing.receipt_number === (receipt_number || null)
    ) {
      return { success: true };
    }

    await updatePayment(paymentId, {
      amount,
      payment_date,
      status,
      payment_method: payment_method || null,
      receipt_number: receipt_number || null,
    });

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "payment.updated",
        entityType: existing.case_id ? "Case" : "Consultation",
        entityId: (existing.case_id ?? existing.consultation_id)!,
        details: `Updated payment: ₱${Number(amount).toFixed(2)}`,
      }),
    );

    revalidatePath(getParentPath(existing));

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "update payment");
  }
}

export async function deletePaymentAction(
  payload: z.input<typeof PaymentIdSchema>,
): Promise<ActionStatusResponse> {
  const session = await requirePermissionOrNull("payment.delete");
  if (!session) return actionForbidden();

  const parsed = PaymentIdSchema.safeParse(payload);
  if (!parsed.success) return actionInvalid("payment");

  const { paymentId } = parsed.data;

  try {
    const existing = await getPaymentById(paymentId);
    if (!existing) return actionNotFound("Payment");

    const access = await getPaymentAccessContext(session.id, paymentId);
    if (!can(session.role, "payment.delete", access)) {
      return actionForbidden();
    }

    await deletePayment(paymentId);

    after(() =>
      logAudit({
        actorUserId: session.id,
        action: "payment.deleted",
        entityType: existing.case_id ? "Case" : "Consultation",
        entityId: (existing.case_id ?? existing.consultation_id)!,
        details: `Deleted payment: ₱${Number(existing.amount).toFixed(2)}`,
      }),
    );

    revalidatePath(getParentPath(existing));

    return { success: true };
  } catch (error) {
    return toActionResponse(error, "delete payment");
  }
}
