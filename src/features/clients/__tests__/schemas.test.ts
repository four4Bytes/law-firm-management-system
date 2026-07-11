import { describe, expect, it } from "vitest";

import { ClientCreatePayloadSchema, ClientUpdatePayloadSchema } from "../schemas";

const uuid = "550e8400-e29b-41d4-a716-446655440000";

describe("ClientCreatePayloadSchema", () => {
  it("accepts a valid payload with only a name", () => {
    expect(ClientCreatePayloadSchema.safeParse({ name: "Alice Client" }).success).toBe(true);
  });

  it("accepts optional email, phone_number and address", () => {
    const result = ClientCreatePayloadSchema.safeParse({
      name: "Alice Client",
      email: "alice@email.com",
      phone_number: "09170000001",
      address: "123 Rizal St.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(ClientCreatePayloadSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only name", () => {
    expect(ClientCreatePayloadSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("rejects a name longer than 255 characters", () => {
    expect(ClientCreatePayloadSchema.safeParse({ name: "x".repeat(256) }).success).toBe(false);
  });

  it("rejects an email longer than 255 characters", () => {
    expect(
      ClientCreatePayloadSchema.safeParse({ name: "Alice", email: "a".repeat(256) }).success,
    ).toBe(false);
  });

  it("rejects a phone_number longer than 50 characters", () => {
    expect(
      ClientCreatePayloadSchema.safeParse({ name: "Alice", phone_number: "1".repeat(51) }).success,
    ).toBe(false);
  });

  it("rejects an address longer than 500 characters", () => {
    expect(
      ClientCreatePayloadSchema.safeParse({ name: "Alice", address: "a".repeat(501) }).success,
    ).toBe(false);
  });

  it("trims surrounding whitespace from name", () => {
    const result = ClientCreatePayloadSchema.safeParse({ name: "  Alice Client  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Alice Client");
  });
});

describe("ClientUpdatePayloadSchema", () => {
  it("requires a uuid id", () => {
    expect(ClientUpdatePayloadSchema.safeParse({ id: "abc", name: "Alice" }).success).toBe(false);
  });

  it("accepts a valid update payload", () => {
    const result = ClientUpdatePayloadSchema.safeParse({
      id: uuid,
      name: "Alice Client",
      email: "alice@email.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(ClientUpdatePayloadSchema.safeParse({ id: uuid, name: "" }).success).toBe(false);
  });

  it("rejects an email longer than 255 characters", () => {
    expect(
      ClientUpdatePayloadSchema.safeParse({ id: uuid, name: "Alice", email: "a".repeat(256) })
        .success,
    ).toBe(false);
  });

  it("rejects a phone_number longer than 50 characters", () => {
    expect(
      ClientUpdatePayloadSchema.safeParse({
        id: uuid,
        name: "Alice",
        phone_number: "1".repeat(51),
      }).success,
    ).toBe(false);
  });

  it("rejects an address longer than 500 characters", () => {
    expect(
      ClientUpdatePayloadSchema.safeParse({ id: uuid, name: "Alice", address: "a".repeat(501) })
        .success,
    ).toBe(false);
  });
});
