import { describe, expect, it } from "vitest";

import {
  CaseCreatePayloadSchema,
  CaseDeletePayloadSchema,
  CaseUpdatePayloadSchema,
} from "../schemas";

const uuid = "550e8400-e29b-41d4-a716-446655440000";

describe("CaseCreatePayloadSchema", () => {
  const base = {
    client_id: uuid,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    status: "Open",
  };

  it("accepts a valid payload", () => {
    expect(CaseCreatePayloadSchema.safeParse(base).success).toBe(true);
  });

  it("accepts an arbitrary free-text case_type not in the old enum", () => {
    const result = CaseCreatePayloadSchema.safeParse({
      ...base,
      case_type: "Arbitrary Custom Type 123",
    });
    expect(result.success).toBe(true);
  });

  it("trims surrounding whitespace from case_type", () => {
    const result = CaseCreatePayloadSchema.safeParse({ ...base, case_type: "  Wills  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.case_type).toBe("Wills");
  });

  it("rejects an empty case_type", () => {
    expect(CaseCreatePayloadSchema.safeParse({ ...base, case_type: "" }).success).toBe(false);
  });

  it("rejects a whitespace-only case_type", () => {
    expect(CaseCreatePayloadSchema.safeParse({ ...base, case_type: "   " }).success).toBe(false);
  });

  it("rejects a case_type longer than 255 characters", () => {
    expect(CaseCreatePayloadSchema.safeParse({ ...base, case_type: "x".repeat(256) }).success).toBe(
      false,
    );
  });

  it("rejects a non-uuid client_id", () => {
    expect(CaseCreatePayloadSchema.safeParse({ ...base, client_id: "abc" }).success).toBe(false);
  });

  it("rejects an empty case_title", () => {
    expect(CaseCreatePayloadSchema.safeParse({ ...base, case_title: "" }).success).toBe(false);
  });

  it("rejects an invalid status", () => {
    expect(CaseCreatePayloadSchema.safeParse({ ...base, status: "Invalid" }).success).toBe(false);
  });

  it("accepts optional parties_involved and source_consultation_id", () => {
    const result = CaseCreatePayloadSchema.safeParse({
      ...base,
      parties_involved: "Smith (Plaintiff)",
      source_consultation_id: uuid,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a parties_involved at the 2000 character boundary", () => {
    expect(
      CaseCreatePayloadSchema.safeParse({ ...base, parties_involved: "x".repeat(2000) }).success,
    ).toBe(true);
  });

  it("rejects a parties_involved longer than 2000 characters", () => {
    expect(
      CaseCreatePayloadSchema.safeParse({ ...base, parties_involved: "x".repeat(2001) }).success,
    ).toBe(false);
  });

  it("rejects a non-uuid source_consultation_id", () => {
    expect(
      CaseCreatePayloadSchema.safeParse({ ...base, source_consultation_id: "abc" }).success,
    ).toBe(false);
  });
});

describe("CaseUpdatePayloadSchema", () => {
  it("requires a caseId", () => {
    const result = CaseUpdatePayloadSchema.safeParse({
      client_id: uuid,
      case_title: "t",
      case_type: "Civil",
      status: "Open",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid update payload", () => {
    const result = CaseUpdatePayloadSchema.safeParse({
      caseId: uuid,
      client_id: uuid,
      case_title: "t",
      case_type: "Civil",
      status: "Open",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid caseId", () => {
    const result = CaseUpdatePayloadSchema.safeParse({
      caseId: "abc",
      client_id: uuid,
      case_title: "t",
      case_type: "Civil",
      status: "Open",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid status inherited from the create schema", () => {
    const result = CaseUpdatePayloadSchema.safeParse({
      caseId: uuid,
      client_id: uuid,
      case_title: "t",
      case_type: "Civil",
      status: "NotAStatus",
    });
    expect(result.success).toBe(false);
  });
});

describe("CaseDeletePayloadSchema", () => {
  it("requires a uuid caseId", () => {
    expect(CaseDeletePayloadSchema.safeParse({ caseId: uuid }).success).toBe(true);
    expect(CaseDeletePayloadSchema.safeParse({ caseId: "abc" }).success).toBe(false);
  });
});
