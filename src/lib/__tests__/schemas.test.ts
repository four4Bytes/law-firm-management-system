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
});
