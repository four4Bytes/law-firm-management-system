import { describe, expect, it } from "vitest";

import { TaskCreatePayloadSchema, TaskIdSchema, TaskUpdatePayloadSchema } from "../schemas";

const uuid = "550e8400-e29b-41d4-a716-446655440000";

describe("TaskIdSchema", () => {
  it("accepts a valid uuid", () => {
    const result = TaskIdSchema.safeParse({ taskId: uuid });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid string", () => {
    const result = TaskIdSchema.safeParse({ taskId: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("TaskCreatePayloadSchema", () => {
  it("accepts a minimal valid payload", () => {
    const result = TaskCreatePayloadSchema.safeParse({
      title: "Task title",
      case_id: uuid,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a payload with all fields", () => {
    const result = TaskCreatePayloadSchema.safeParse({
      title: "Task title",
      description: "A description",
      status: "Ongoing",
      case_id: uuid,
      assignee_ids: [uuid],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = TaskCreatePayloadSchema.safeParse({ title: "", case_id: uuid });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only title", () => {
    const result = TaskCreatePayloadSchema.safeParse({ title: "   ", case_id: uuid });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = TaskCreatePayloadSchema.safeParse({
      title: "Task",
      status: "InvalidStatus",
      case_id: uuid,
    });
    expect(result.success).toBe(false);
  });

  it("defaults status to Pending", () => {
    const result = TaskCreatePayloadSchema.safeParse({ title: "Task", case_id: uuid });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("Pending");
    }
  });
});

describe("TaskUpdatePayloadSchema", () => {
  it("accepts a valid payload", () => {
    const result = TaskUpdatePayloadSchema.safeParse({
      taskId: uuid,
      title: "Updated title",
      status: "Accepted",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a payload with all fields", () => {
    const result = TaskUpdatePayloadSchema.safeParse({
      taskId: uuid,
      title: "Updated title",
      description: "Updated description",
      status: "Rejected",
      assignee_ids: [uuid],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = TaskUpdatePayloadSchema.safeParse({
      taskId: uuid,
      title: "",
      status: "Pending",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = TaskUpdatePayloadSchema.safeParse({
      taskId: uuid,
      title: "Task",
      status: "BadStatus",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing status", () => {
    const result = TaskUpdatePayloadSchema.safeParse({
      taskId: uuid,
      title: "Task",
    });
    expect(result.success).toBe(false);
  });
});
