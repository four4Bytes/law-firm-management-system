import { describe, expect, it } from "vitest";

import {
  ConsultationCreatePayloadSchema,
  ConsultationDeletePayloadSchema,
  ConsultationUpdatePayloadSchema,
} from "../schemas";

const uuid = "550e8400-e29b-41d4-a716-446655440000";

describe("ConsultationCreatePayloadSchema", () => {
  const base = {
    client_id: uuid,
    concern: "Breach of contract",
    booking_datetime: "2024-07-15T10:00:00.000Z",
    status: "Scheduled",
  };

  it("accepts a valid payload", () => {
    expect(ConsultationCreatePayloadSchema.safeParse(base).success).toBe(true);
  });

  it("coerces booking_datetime string to Date", () => {
    const result = ConsultationCreatePayloadSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.booking_datetime).toBeInstanceOf(Date);
  });

  it("rejects an empty concern", () => {
    expect(ConsultationCreatePayloadSchema.safeParse({ ...base, concern: "" }).success).toBe(false);
  });

  it("rejects a concern longer than 500 characters", () => {
    expect(
      ConsultationCreatePayloadSchema.safeParse({ ...base, concern: "x".repeat(501) }).success,
    ).toBe(false);
  });

  it("rejects a non-uuid client_id", () => {
    expect(ConsultationCreatePayloadSchema.safeParse({ ...base, client_id: "abc" }).success).toBe(
      false,
    );
  });

  it("rejects an invalid booking_datetime", () => {
    expect(
      ConsultationCreatePayloadSchema.safeParse({ ...base, booking_datetime: "not-a-date" })
        .success,
    ).toBe(false);
  });

  it("rejects an invalid status", () => {
    expect(ConsultationCreatePayloadSchema.safeParse({ ...base, status: "Invalid" }).success).toBe(
      false,
    );
  });
});

describe("ConsultationUpdatePayloadSchema", () => {
  it("requires a uuid consultationId", () => {
    const result = ConsultationUpdatePayloadSchema.safeParse({
      client_id: uuid,
      concern: "c",
      booking_datetime: "2024-07-15T10:00:00.000Z",
      status: "Scheduled",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid update payload", () => {
    const result = ConsultationUpdatePayloadSchema.safeParse({
      consultationId: uuid,
      client_id: uuid,
      concern: "c",
      booking_datetime: "2024-07-15T10:00:00.000Z",
      status: "Scheduled",
    });
    expect(result.success).toBe(true);
  });
});

describe("ConsultationDeletePayloadSchema", () => {
  it("requires a uuid consultationId", () => {
    expect(ConsultationDeletePayloadSchema.safeParse({ consultationId: uuid }).success).toBe(true);
    expect(ConsultationDeletePayloadSchema.safeParse({ consultationId: "abc" }).success).toBe(
      false,
    );
  });
});
