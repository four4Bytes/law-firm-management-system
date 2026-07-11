import { describe, expect, it } from "vitest";

import {
  PaymentCreatePayloadSchema,
  PaymentIdSchema,
  PaymentUpdatePayloadSchema,
} from "../schemas";

const uuid = "550e8400-e29b-41d4-a716-446655440000";

describe("PaymentIdSchema", () => {
  it("accepts a valid uuid", () => {
    const result = PaymentIdSchema.safeParse({ paymentId: uuid });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid string", () => {
    const result = PaymentIdSchema.safeParse({ paymentId: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("PaymentCreatePayloadSchema", () => {
  it("accepts a payload with case_id", () => {
    const result = PaymentCreatePayloadSchema.safeParse({
      amount: "50000",
      payment_date: "2024-06-15",
      status: "Paid",
      case_id: uuid,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a payload with consultation_id", () => {
    const result = PaymentCreatePayloadSchema.safeParse({
      amount: "25000",
      payment_date: "2024-06-15",
      status: "Partial",
      consultation_id: uuid,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a payload with all optional fields", () => {
    const result = PaymentCreatePayloadSchema.safeParse({
      amount: "15000",
      payment_date: "2024-06-20",
      status: "Unpaid",
      payment_method: "GCash",
      receipt_number: "RET-001",
      case_id: uuid,
    });
    expect(result.success).toBe(true);
  });

  it("rejects when both parents are missing", () => {
    const result = PaymentCreatePayloadSchema.safeParse({
      amount: "50000",
      payment_date: "2024-06-15",
      status: "Paid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects when both parents are provided", () => {
    const result = PaymentCreatePayloadSchema.safeParse({
      amount: "50000",
      payment_date: "2024-06-15",
      status: "Paid",
      case_id: uuid,
      consultation_id: uuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative amount", () => {
    const result = PaymentCreatePayloadSchema.safeParse({
      amount: "-100",
      payment_date: "2024-06-15",
      status: "Paid",
      case_id: uuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero amount", () => {
    const result = PaymentCreatePayloadSchema.safeParse({
      amount: "0",
      payment_date: "2024-06-15",
      status: "Paid",
      case_id: uuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = PaymentCreatePayloadSchema.safeParse({
      amount: "50000",
      payment_date: "2024-06-15",
      status: "InvalidStatus",
      case_id: uuid,
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid statuses", () => {
    for (const status of ["Unpaid", "Partial", "Paid", "Refunded"]) {
      const result = PaymentCreatePayloadSchema.safeParse({
        amount: "1000",
        payment_date: "2024-06-15",
        status,
        case_id: uuid,
      });
      expect(result.success).toBe(true);
    }
  });

  it("coerces string amount to number", () => {
    const result = PaymentCreatePayloadSchema.safeParse({
      amount: "1234.56",
      payment_date: "2024-06-15",
      status: "Paid",
      case_id: uuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(1234.56);
    }
  });

  it("coerces date string to Date", () => {
    const result = PaymentCreatePayloadSchema.safeParse({
      amount: "50000",
      payment_date: "2024-06-15",
      status: "Paid",
      case_id: uuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payment_date).toBeInstanceOf(Date);
    }
  });
});

describe("PaymentUpdatePayloadSchema", () => {
  it("accepts a valid payload", () => {
    const result = PaymentUpdatePayloadSchema.safeParse({
      paymentId: uuid,
      amount: "75000",
      payment_date: "2024-07-01",
      status: "Refunded",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a payload with optional fields", () => {
    const result = PaymentUpdatePayloadSchema.safeParse({
      paymentId: uuid,
      amount: "75000",
      payment_date: "2024-07-01",
      status: "Partial",
      payment_method: "Credit Card",
      receipt_number: "RET-002",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative amount", () => {
    const result = PaymentUpdatePayloadSchema.safeParse({
      paymentId: uuid,
      amount: "-1",
      payment_date: "2024-07-01",
      status: "Paid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = PaymentUpdatePayloadSchema.safeParse({
      paymentId: uuid,
      amount: "75000",
      payment_date: "2024-07-01",
      status: "BadStatus",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing paymentId", () => {
    const result = PaymentUpdatePayloadSchema.safeParse({
      amount: "75000",
      payment_date: "2024-07-01",
      status: "Paid",
    });
    expect(result.success).toBe(false);
  });
});
