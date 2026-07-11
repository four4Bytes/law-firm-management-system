import { beforeEach, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { createPayment, deletePayment, updatePayment } from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: { payment: { create: vi.fn(), update: vi.fn(), delete: vi.fn() } },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

it("creates a payment linked to a case", async () => {
  vi.mocked(prisma.payment.create).mockResolvedValue({
    id: "p1",
    amount: 50000,
    payment_date: new Date("2024-06-15"),
    status: "Paid",
    payment_method: "Bank Transfer",
    receipt_number: "RET-001",
    case_id: "c1",
    consultation_id: null,
    created_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  } as never);

  const result = await createPayment({
    amount: 50000,
    payment_date: new Date("2024-06-15"),
    status: "Paid",
    payment_method: "Bank Transfer",
    receipt_number: "RET-001",
    case_id: "c1",
    created_by_user_id: "u1",
  });

  expect(result.id).toBe("p1");
  expect(prisma.payment.create).toHaveBeenCalledWith({
    data: {
      amount: 50000,
      payment_date: new Date("2024-06-15"),
      status: "Paid",
      payment_method: "Bank Transfer",
      receipt_number: "RET-001",
      case_id: "c1",
      consultation_id: null,
      created_by_user_id: "u1",
    },
    select: { id: true },
  });
});

it("creates a payment linked to a consultation", async () => {
  vi.mocked(prisma.payment.create).mockResolvedValue({
    id: "p2",
    amount: 25000,
    payment_date: new Date("2024-06-20"),
    status: "Partial",
    payment_method: "GCash",
    receipt_number: null,
    case_id: null,
    consultation_id: "con1",
    created_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  } as never);

  await createPayment({
    amount: 25000,
    payment_date: new Date("2024-06-20"),
    status: "Partial",
    payment_method: "GCash",
    consultation_id: "con1",
    created_by_user_id: "u1",
  });

  expect(prisma.payment.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      consultation_id: "con1",
    }),
    select: { id: true },
  });
});

it("creates a payment with minimal fields", async () => {
  vi.mocked(prisma.payment.create).mockResolvedValue({
    id: "p3",
    amount: 1000,
    payment_date: new Date("2024-07-01"),
    status: "Unpaid",
    payment_method: null,
    receipt_number: null,
    case_id: "c1",
    consultation_id: null,
    created_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  } as never);

  await createPayment({
    amount: 1000,
    payment_date: new Date("2024-07-01"),
    status: "Unpaid",
    case_id: "c1",
    created_by_user_id: "u1",
  });

  expect(prisma.payment.create).toHaveBeenCalledWith({
    data: {
      amount: 1000,
      payment_date: new Date("2024-07-01"),
      status: "Unpaid",
      payment_method: null,
      receipt_number: null,
      case_id: "c1",
      consultation_id: null,
      created_by_user_id: "u1",
    },
    select: { id: true },
  });
});

it("updates a payment", async () => {
  vi.mocked(prisma.payment.update).mockResolvedValue({
    id: "p1",
    amount: 55000,
    payment_date: new Date("2024-06-15"),
    status: "Refunded",
    payment_method: "Bank Transfer",
    receipt_number: "RET-001",
    case_id: "c1",
    consultation_id: null,
    created_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  } as never);

  const result = await updatePayment("p1", {
    amount: 55000,
    payment_date: new Date("2024-06-15"),
    status: "Refunded",
  });

  expect(result.id).toBe("p1");
  expect(prisma.payment.update).toHaveBeenCalledWith({
    where: { id: "p1" },
    data: {
      amount: 55000,
      payment_date: new Date("2024-06-15"),
      status: "Refunded",
      payment_method: null,
      receipt_number: null,
    },
    select: { id: true },
  });
});

it("updates a payment with optional fields", async () => {
  vi.mocked(prisma.payment.update).mockResolvedValue({
    id: "p1",
    amount: 75000,
    payment_date: new Date("2024-07-01"),
    status: "Paid",
    payment_method: "Credit Card",
    receipt_number: "RET-002",
    case_id: "c1",
    consultation_id: null,
    created_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  } as never);

  await updatePayment("p1", {
    amount: 75000,
    payment_date: new Date("2024-07-01"),
    status: "Paid",
    payment_method: "Credit Card",
    receipt_number: "RET-002",
  });

  expect(prisma.payment.update).toHaveBeenCalledWith({
    where: { id: "p1" },
    data: {
      amount: 75000,
      payment_date: new Date("2024-07-01"),
      status: "Paid",
      payment_method: "Credit Card",
      receipt_number: "RET-002",
    },
    select: { id: true },
  });
});

it("deletes a payment", async () => {
  vi.mocked(prisma.payment.delete).mockResolvedValue({
    id: "p1",
    amount: 50000,
    payment_date: new Date("2024-06-15"),
    status: "Paid",
    payment_method: "Bank Transfer",
    receipt_number: "RET-001",
    case_id: "c1",
    consultation_id: null,
    created_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  } as never);

  const result = await deletePayment("p1");

  expect(result.id).toBe("p1");
  expect(prisma.payment.delete).toHaveBeenCalledWith({ where: { id: "p1" }, select: { id: true } });
});

it("propagates error when deleting nonexistent payment", async () => {
  const error = new Error("Record not found");
  vi.mocked(prisma.payment.delete).mockRejectedValue(error);

  await expect(deletePayment("999")).rejects.toThrow(error);
});

it("propagates error when updating nonexistent payment", async () => {
  const error = new Error("Record not found");
  vi.mocked(prisma.payment.update).mockRejectedValue(error);

  await expect(
    updatePayment("999", {
      amount: 100,
      payment_date: new Date("2024-07-01"),
      status: "Paid",
    }),
  ).rejects.toThrow(error);
});

it("propagates error when creating payment fails", async () => {
  const error = new Error("Database connection failed");
  vi.mocked(prisma.payment.create).mockRejectedValue(error);

  await expect(
    createPayment({
      amount: 50000,
      payment_date: new Date("2024-06-15"),
      status: "Paid",
      case_id: "c1",
      created_by_user_id: "u1",
    }),
  ).rejects.toThrow(error);
});
