import { describe, expect, it } from "vitest";

import {
  ConsultationCreatePayloadSchema,
  ConsultationDeletePayloadSchema,
  ConsultationUpdatePayloadSchema,
  ConsultationWithClientCreatePayloadSchema,
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

  it("accepts a valid assignee_ids list", () => {
    const result = ConsultationCreatePayloadSchema.safeParse({
      ...base,
      assignee_ids: [uuid],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid assignee id", () => {
    const result = ConsultationCreatePayloadSchema.safeParse({
      ...base,
      assignee_ids: ["abc"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate assignee ids", () => {
    const result = ConsultationCreatePayloadSchema.safeParse({
      ...base,
      assignee_ids: [uuid, uuid],
    });
    expect(result.success).toBe(false);
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

describe("ConsultationWithClientCreatePayloadSchema phone number", () => {
  const base = {
    client: { name: "John Doe", phone_number: "09170000001" },
    consultation: {
      concern: "Breach of contract",
      booking_datetime: "2024-07-15T10:00:00.000Z",
      status: "Scheduled",
    },
  };

  it("accepts an 11-digit number starting with 09", () => {
    expect(ConsultationWithClientCreatePayloadSchema.safeParse(base).success).toBe(true);
  });

  it("rejects numbers not starting with 09", () => {
    const result = ConsultationWithClientCreatePayloadSchema.safeParse({
      ...base,
      client: { ...base.client, phone_number: "08170000001" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Phone number must be 11 digits starting with 09",
      );
    }
  });
});
