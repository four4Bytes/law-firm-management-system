import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import {
  getPaymentById,
  getPaymentRowById,
  getPaymentsPaginated,
  type PaymentRow,
} from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: { payment: { findUnique: vi.fn(), findMany: vi.fn() } },
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

describe("getPaymentsPaginated", () => {
  const mockPayment = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: "p1",
    amount: 50000,
    payment_date: new Date("2024-06-15"),
    status: "Paid",
    payment_method: "Bank Transfer",
    receipt_number: "RET-2024-001",
    case_id: "c1",
    consultation_id: null,
    created_by_user_id: "u1",
    created_at: new Date("2024-06-15"),
    updated_at: new Date("2024-06-15"),
    ...overrides,
  });

  it("returns mapped payment rows filtered by caseId", async () => {
    const payments = [mockPayment(), mockPayment({ id: "p2", amount: 25000, status: "Partial" })];
    vi.mocked(prisma.payment.findMany).mockResolvedValue(payments as never[]);

    const result = await getPaymentsPaginated({ caseId: "c1", pageSize: 10 });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "p1",
      amount: 50000,
      payment_date: payments[0].payment_date,
      payment_method: "Bank Transfer",
      receipt_number: "RET-2024-001",
      status: "Paid",
    });
    expect(result.rows[1]).toEqual({
      id: "p2",
      amount: 25000,
      payment_date: payments[1].payment_date,
      payment_method: "Bank Transfer",
      receipt_number: "RET-2024-001",
      status: "Partial",
    });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { case_id: "c1" } }),
    );
  });

  it("returns mapped payment rows filtered by consultationId", async () => {
    const payments = [mockPayment({ case_id: null, consultation_id: "con1" })];
    vi.mocked(prisma.payment.findMany).mockResolvedValue(payments as never[]);

    const result = await getPaymentsPaginated({ consultationId: "con1", pageSize: 10 });

    expect(result.rows).toHaveLength(1);
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { consultation_id: "con1" } }),
    );
  });

  it("filters by search across multiple fields", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([mockPayment()] as never[]);

    await getPaymentsPaginated({ caseId: "c1", search: "GCash" });

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          case_id: "c1",
          OR: [
            { payment_method: { contains: "GCash", mode: "insensitive" } },
            { status: { contains: "GCash", mode: "insensitive" } },
            { receipt_number: { contains: "GCash", mode: "insensitive" } },
          ],
        },
      }),
    );
  });

  it("handles cursor pagination", async () => {
    const payments = Array.from({ length: 4 }, (_, i) => mockPayment({ id: String(i + 1) }));
    vi.mocked(prisma.payment.findMany).mockResolvedValue(payments as never[]);

    const result = await getPaymentsPaginated({ caseId: "c1", pageSize: 3 });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("returns empty when none exist", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);

    const result = await getPaymentsPaginated({ caseId: "c1" });

    expect(result.rows).toEqual([]);
  });

  it("sorts by amount ascending", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
    await getPaymentsPaginated({
      caseId: "c1",
      sort: { column: "amount", direction: "asc" },
    });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ amount: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by amount descending", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
    await getPaymentsPaginated({
      caseId: "c1",
      sort: { column: "amount", direction: "desc" },
    });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ amount: "desc" }, { id: "asc" }] }),
    );
  });

  it("sorts by payment_date ascending", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
    await getPaymentsPaginated({
      caseId: "c1",
      sort: { column: "payment_date", direction: "asc" },
    });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ payment_date: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by status descending", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
    await getPaymentsPaginated({
      caseId: "c1",
      sort: { column: "status", direction: "desc" },
    });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ status: "desc" }, { id: "asc" }] }),
    );
  });
});
