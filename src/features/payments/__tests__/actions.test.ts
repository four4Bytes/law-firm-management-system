import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";

import { deletePaymentAction } from "../actions";

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u1", email: "e", role: "admin", name: "n" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    payment: { findUnique: vi.fn(), delete: vi.fn() },
  },
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

const paymentRecord: Prisma.PaymentGetPayload<{
  select: {
    id: true;
    amount: true;
    payment_date: true;
    status: true;
    payment_method: true;
    receipt_number: true;
    case_id: true;
    consultation_id: true;
    created_at: true;
    updated_at: true;
    created_by_user_id: true;
  };
}> = {
  id: uuid,
  amount: new Prisma.Decimal(500),
  payment_date: new Date("2024-06-01"),
  status: "Paid",
  payment_method: "Cash",
  receipt_number: "R-001",
  case_id: "c1",
  consultation_id: null,
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  created_by_user_id: "u1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deletePaymentAction", () => {
  it("returns an error for an invalid payload", async () => {
    expect(await deletePaymentAction("")).toEqual({
      success: false,
      error: "Invalid payment ID",
    });
  });

  it("returns an error for a non-uuid paymentId", async () => {
    expect(await deletePaymentAction("abc")).toEqual({
      success: false,
      error: "Invalid payment ID",
    });
  });

  it("returns an error when the payment is not found", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(null);

    expect(await deletePaymentAction(uuid)).toEqual({
      success: false,
      error: "Payment not found",
    });
  });

  it("deletes the payment and revalidates the case path", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(paymentRecord);

    const result = await deletePaymentAction(uuid);

    expect(result).toEqual({ success: true });
    expect(prisma.payment.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: uuid } }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/case/c1");
  });

  it("revalidates the consultation path when the payment belongs to a consultation", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue({
      ...paymentRecord,
      case_id: null,
      consultation_id: "con1",
    });

    expect(await deletePaymentAction(uuid)).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith("/consultation/con1");
  });

  it("returns an error when deletion fails", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(paymentRecord);
    vi.mocked(prisma.payment.delete).mockRejectedValue(new Error("db error"));

    expect(await deletePaymentAction(uuid)).toEqual({
      success: false,
      error: "Failed to delete payment",
    });
  });
});