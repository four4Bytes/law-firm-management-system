import { describe, expect, it } from "vitest";

import { ClientDataSchema } from "@/lib/schemas";

describe("ClientDataSchema", () => {
  it("reports a friendly required message for an empty client name", () => {
    expect(ClientDataSchema.shape.name.safeParse(undefined).error?.issues[0]?.message).toBe(
      "Client name is required",
    );
  });

  it("allows an optional email to be omitted", () => {
    expect(ClientDataSchema.shape.email.safeParse(undefined).success).toBe(true);
  });

  it("reports a friendly format message for an invalid email", () => {
    expect(ClientDataSchema.shape.email.safeParse("not-an-email").error?.issues[0]?.message).toBe(
      "Enter a valid email",
    );
  });

  it("accepts an 11-digit phone number", () => {
    expect(ClientDataSchema.shape.phone_number.safeParse("09170000001").success).toBe(true);
  });

  it("rejects missing, short, long, and non-digit phone numbers", () => {
    const field = ClientDataSchema.shape.phone_number;
    expect(field.safeParse("").error?.issues[0]?.message).toBe("Phone number is required");
    for (const value of ["12345", "123456789012", "abcdefghijk", "0917-000-001", "0917 000001"]) {
      expect(field.safeParse(value).error?.issues[0]?.message).toBe(
        "Phone number must be exactly 11 digits",
      );
    }
  });
});
