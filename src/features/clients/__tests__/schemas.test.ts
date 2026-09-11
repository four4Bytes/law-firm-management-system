import { describe, expect, it } from "vitest";

import { ClientCreatePayloadSchema, ClientUpdatePayloadSchema } from "../schemas";

const uuid = "550e8400-e29b-41d4-a716-446655440000";

describe("ClientCreatePayloadSchema", () => {
  it("accepts a valid payload with only a name and phone_number", () => {
    expect(
      ClientCreatePayloadSchema.safeParse({ name: "Alice Client", phone_number: "09170000001" })
        .success,
    ).toBe(true);
  });

  it("accepts a valid payload with required phone_number", () => {
    const result = ClientCreatePayloadSchema.safeParse({
      name: "Alice Client",
      phone_number: "09170000001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing phone_number", () => {
    expect(ClientCreatePayloadSchema.safeParse({ name: "Alice Client" }).success).toBe(false);
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
    const result = ClientCreatePayloadSchema.safeParse({
      name: "  Alice Client  ",
      phone_number: "09170000001",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Alice Client");
  });
});

describe("ClientUpdatePayloadSchema", () => {
  it("requires a uuid clientId", () => {
    expect(ClientUpdatePayloadSchema.safeParse({ clientId: "abc", name: "Alice" }).success).toBe(
      false,
    );
  });

  it("accepts a valid update payload with phone_number", () => {
    const result = ClientUpdatePayloadSchema.safeParse({
      clientId: uuid,
      name: "Alice Client",
      phone_number: "09170000001",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(ClientUpdatePayloadSchema.safeParse({ clientId: uuid, name: "" }).success).toBe(false);
  });

  it("rejects an email longer than 255 characters", () => {
    expect(
      ClientUpdatePayloadSchema.safeParse({ clientId: uuid, name: "Alice", email: "a".repeat(256) })
        .success,
    ).toBe(false);
  });

  it("rejects a phone_number longer than 50 characters", () => {
    expect(
      ClientUpdatePayloadSchema.safeParse({
        clientId: uuid,
        name: "Alice",
        phone_number: "1".repeat(51),
      }).success,
    ).toBe(false);
  });

  it("rejects an address longer than 500 characters", () => {
    expect(
      ClientUpdatePayloadSchema.safeParse({
        clientId: uuid,
        name: "Alice",
        address: "a".repeat(501),
      }).success,
    ).toBe(false);
  });
});
