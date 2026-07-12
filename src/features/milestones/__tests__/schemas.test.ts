import { describe, expect, it } from "vitest";

import {
  MilestoneCreatePayloadSchema,
  MilestoneIdSchema,
  MilestoneUpdatePayloadSchema,
} from "../schemas";

const uuid = "550e8400-e29b-41d4-a716-446655440000";

describe("MilestoneIdSchema", () => {
  it("accepts a valid uuid", () => {
    const result = MilestoneIdSchema.safeParse({ milestoneId: uuid });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid string", () => {
    const result = MilestoneIdSchema.safeParse({ milestoneId: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("MilestoneCreatePayloadSchema", () => {
  it("accepts a valid payload", () => {
    const result = MilestoneCreatePayloadSchema.safeParse({
      title: "Initial Filing",
      due_date: "2024-07-15",
      status: "Pending",
      case_id: uuid,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a payload with description", () => {
    const result = MilestoneCreatePayloadSchema.safeParse({
      title: "Court Hearing",
      description: "Attend the preliminary hearing",
      due_date: "2024-08-01",
      status: "Done",
      case_id: uuid,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a payload with default status", () => {
    const result = MilestoneCreatePayloadSchema.safeParse({
      title: "New Milestone",
      due_date: "2024-07-15",
      case_id: uuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("Pending");
    }
  });

  it("rejects empty title", () => {
    const result = MilestoneCreatePayloadSchema.safeParse({
      title: "",
      due_date: "2024-07-15",
      case_id: uuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace title", () => {
    const result = MilestoneCreatePayloadSchema.safeParse({
      title: "   ",
      due_date: "2024-07-15",
      case_id: uuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects long title", () => {
    const result = MilestoneCreatePayloadSchema.safeParse({
      title: "x".repeat(501),
      due_date: "2024-07-15",
      case_id: uuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = MilestoneCreatePayloadSchema.safeParse({
      title: "Test",
      due_date: "2024-07-15",
      status: "InvalidStatus",
      case_id: uuid,
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid statuses", () => {
    for (const status of ["Pending", "Done", "Cancelled"]) {
      const result = MilestoneCreatePayloadSchema.safeParse({
        title: "Test",
        due_date: "2024-07-15",
        status,
        case_id: uuid,
      });
      expect(result.success).toBe(true);
    }
  });

  it("coerces due_date string to Date", () => {
    const result = MilestoneCreatePayloadSchema.safeParse({
      title: "Test",
      due_date: "2024-07-15",
      case_id: uuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.due_date).toBeInstanceOf(Date);
    }
  });

  it("rejects missing case_id", () => {
    const result = MilestoneCreatePayloadSchema.safeParse({
      title: "Test",
      due_date: "2024-07-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty description when provided", () => {
    const result = MilestoneCreatePayloadSchema.safeParse({
      title: "Test",
      description: "",
      due_date: "2024-07-15",
      case_id: uuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only description", () => {
    const result = MilestoneCreatePayloadSchema.safeParse({
      title: "Test",
      description: "   ",
      due_date: "2024-07-15",
      case_id: uuid,
    });
    expect(result.success).toBe(false);
  });
});

describe("MilestoneUpdatePayloadSchema", () => {
  it("accepts a valid payload", () => {
    const result = MilestoneUpdatePayloadSchema.safeParse({
      milestoneId: uuid,
      title: "Updated Milestone",
      due_date: "2024-08-01",
      status: "Done",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a payload with description", () => {
    const result = MilestoneUpdatePayloadSchema.safeParse({
      milestoneId: uuid,
      title: "Updated",
      description: "New description",
      due_date: "2024-08-01",
      status: "Cancelled",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = MilestoneUpdatePayloadSchema.safeParse({
      milestoneId: uuid,
      title: "",
      due_date: "2024-08-01",
      status: "Pending",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = MilestoneUpdatePayloadSchema.safeParse({
      milestoneId: uuid,
      title: "Test",
      due_date: "2024-08-01",
      status: "BadStatus",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing milestoneId", () => {
    const result = MilestoneUpdatePayloadSchema.safeParse({
      title: "Test",
      due_date: "2024-08-01",
      status: "Pending",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty description when provided", () => {
    const result = MilestoneUpdatePayloadSchema.safeParse({
      milestoneId: uuid,
      title: "Test",
      description: "",
      due_date: "2024-08-01",
      status: "Pending",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only description", () => {
    const result = MilestoneUpdatePayloadSchema.safeParse({
      milestoneId: uuid,
      title: "Test",
      description: "   ",
      due_date: "2024-08-01",
      status: "Pending",
    });
    expect(result.success).toBe(false);
  });
});
