import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { getPaymentById, getPaymentRowById, type PaymentRow } from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: { payment: { findUnique: vi.fn() } },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPayment = (overrides: Record<string, unknown> = {}): any => ({
  id: "p1",
  amount: 50000,
  payment_date: new Date("2024-06-15"),
  status: "Paid",
  payment_method: "Bank Transfer",
  receipt_number: "RET-001",
  case_id: "c1",
  consultation_id: null,
  created_by_user_id: "u1",
  created_at: new Date("2024-06-15"),
  updated_at: new Date("2024-06-15"),
  ...overrides,
});

describe("getPaymentById", () => {
  it("returns payment with parent IDs", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(mockPayment());

    const result = await getPaymentById("p1");

    expect(result).toMatchObject({
      id: "p1",
      amount: 50000,
      payment_date: new Date("2024-06-15"),
      status: "Paid",
      case_id: "c1",
      consultation_id: null,
    });
    expect(prisma.payment.findUnique).toHaveBeenCalledWith({
      where: { id: "p1" },
      select: {
        id: true,
        amount: true,
        payment_date: true,
        status: true,
        payment_method: true,
        receipt_number: true,
        case_id: true,
        consultation_id: true,
      },
    });
  });

  it("returns payment linked to consultation", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(
      mockPayment({
        case_id: null,
        consultation_id: "con1",
      }),
    );

    const result = await getPaymentById("p1");

    expect(result).toMatchObject({
      case_id: null,
      consultation_id: "con1",
    });
  });

  it("returns null when not found", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(null);

    const result = await getPaymentById("999");

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.payment.findUnique).mockRejectedValue(error);

    await expect(getPaymentById("p1")).rejects.toThrow(error);
  });
});

describe("getPaymentRowById", () => {
  it("maps to PaymentRow shape", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(mockPayment());

    const result = await getPaymentRowById("p1");

    const expected: PaymentRow = {
      id: "p1",
      amount: 50000,
      payment_date: new Date("2024-06-15"),
      payment_method: "Bank Transfer",
      receipt_number: "RET-001",
      status: "Paid",
    };
    expect(result).toEqual(expected);
  });

  it("handles nullable fields", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(
      mockPayment({
        payment_method: null,
        receipt_number: null,
      }),
    );

    const result = await getPaymentRowById("p1");

    expect(result).toMatchObject({
      payment_method: null,
      receipt_number: null,
    });
  });

  it("converts Decimal amount to number", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(mockPayment({ amount: 12345.67 }));

    const result = await getPaymentRowById("p1");

    expect(result?.amount).toBe(12345.67);
    expect(typeof result?.amount).toBe("number");
  });

  it("returns null when not found", async () => {
    vi.mocked(prisma.payment.findUnique).mockResolvedValue(null);

    const result = await getPaymentRowById("999");

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.payment.findUnique).mockRejectedValue(error);

    await expect(getPaymentRowById("p1")).rejects.toThrow(error);
  });
});
