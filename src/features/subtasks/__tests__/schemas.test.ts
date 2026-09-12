import { describe, expect, it } from "vitest";

import {
  SubtaskCreatePayloadSchema,
  SubtaskIdSchema,
  SubtaskStatusChangeSchema,
  SubtaskUpdatePayloadSchema,
} from "../schemas";

const uuid = "550e8400-e29b-41d4-a716-446655440000";

describe("SubtaskIdSchema", () => {
  it("accepts a valid uuid", () => {
    const result = SubtaskIdSchema.safeParse({ subtaskId: uuid });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid string", () => {
    const result = SubtaskIdSchema.safeParse({ subtaskId: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("SubtaskCreatePayloadSchema", () => {
  it("accepts a minimal valid payload with Pending default", () => {
    const result = SubtaskCreatePayloadSchema.safeParse({
      title: "Subtask title",
      task_id: uuid,
      assignee_ids: [uuid],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe("Pending");
  });

  it("accepts a payload with all fields", () => {
    const result = SubtaskCreatePayloadSchema.safeParse({
      title: "Subtask title",
      description: "A description",
      priority: "High",
      due_date: new Date("2026-09-20"),
      status: "InProgress",
      task_id: uuid,
      assignee_ids: [uuid],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = SubtaskCreatePayloadSchema.safeParse({
      title: "",
      task_id: uuid,
      assignee_ids: [uuid],
    });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only title", () => {
    const result = SubtaskCreatePayloadSchema.safeParse({
      title: "   ",
      task_id: uuid,
      assignee_ids: [uuid],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty assignee list", () => {
    const result = SubtaskCreatePayloadSchema.safeParse({
      title: "Subtask",
      task_id: uuid,
      assignee_ids: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate assignee ids", () => {
    const result = SubtaskCreatePayloadSchema.safeParse({
      title: "Subtask",
      task_id: uuid,
      assignee_ids: [uuid, uuid],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an over-long priority", () => {
    const result = SubtaskCreatePayloadSchema.safeParse({
      title: "Subtask",
      task_id: uuid,
      assignee_ids: [uuid],
      priority: "x".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid task id", () => {
    const result = SubtaskCreatePayloadSchema.safeParse({
      title: "Subtask",
      task_id: "abc",
      assignee_ids: [uuid],
    });
    expect(result.success).toBe(false);
  });
});

describe("SubtaskUpdatePayloadSchema", () => {
  it("accepts a valid payload", () => {
    const result = SubtaskUpdatePayloadSchema.safeParse({
      subtaskId: uuid,
      title: "Updated title",
      status: "Completed",
      assignee_ids: [uuid],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = SubtaskUpdatePayloadSchema.safeParse({
      subtaskId: uuid,
      title: "",
      status: "Pending",
      assignee_ids: [uuid],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown status", () => {
    const result = SubtaskUpdatePayloadSchema.safeParse({
      subtaskId: uuid,
      title: "Title",
      status: "Submitted",
      assignee_ids: [uuid],
    });
    expect(result.success).toBe(false);
  });
});

describe("SubtaskStatusChangeSchema", () => {
  it("accepts each supported status", () => {
    for (const status of ["Pending", "InProgress", "Completed", "Cancelled"]) {
      const result = SubtaskStatusChangeSchema.safeParse({ subtaskId: uuid, status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects an unsupported status", () => {
    const result = SubtaskStatusChangeSchema.safeParse({ subtaskId: uuid, status: "Submitted" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid subtask id", () => {
    const result = SubtaskStatusChangeSchema.safeParse({ subtaskId: "abc", status: "Pending" });
    expect(result.success).toBe(false);
  });
});
