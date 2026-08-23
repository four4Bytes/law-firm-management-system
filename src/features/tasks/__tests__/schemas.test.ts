import { describe, expect, it } from "vitest";

import {
  TaskAddReviewerSchema,
  TaskCancelSchema,
  TaskCreatePayloadSchema,
  TaskIdSchema,
  TaskReviewSchema,
  TaskSubmitSchema,
  TaskUpdatePayloadSchema,
} from "../schemas";

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
      assignee_ids: [uuid],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a payload with all fields", () => {
    const result = TaskCreatePayloadSchema.safeParse({
      title: "Task title",
      description: "A description",
      case_id: uuid,
      assignee_ids: [uuid],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = TaskCreatePayloadSchema.safeParse({
      title: "",
      case_id: uuid,
      assignee_ids: [uuid],
    });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only title", () => {
    const result = TaskCreatePayloadSchema.safeParse({
      title: "   ",
      case_id: uuid,
      assignee_ids: [uuid],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a payload without assignees", () => {
    const result = TaskCreatePayloadSchema.safeParse({ title: "Task", case_id: uuid });
    expect(result.success).toBe(false);
  });

  it("rejects an empty assignee list", () => {
    const result = TaskCreatePayloadSchema.safeParse({
      title: "Task",
      case_id: uuid,
      assignee_ids: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate assignee ids", () => {
    const result = TaskCreatePayloadSchema.safeParse({
      title: "Task",
      case_id: uuid,
      assignee_ids: [uuid, uuid],
    });
    expect(result.success).toBe(false);
  });
});

describe("TaskUpdatePayloadSchema", () => {
  it("accepts a valid payload", () => {
    const result = TaskUpdatePayloadSchema.safeParse({
      taskId: uuid,
      title: "Updated title",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a payload with all fields", () => {
    const result = TaskUpdatePayloadSchema.safeParse({
      taskId: uuid,
      title: "Updated title",
      description: "Updated description",
      assignee_ids: [uuid],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = TaskUpdatePayloadSchema.safeParse({
      taskId: uuid,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate assignee ids", () => {
    const result = TaskUpdatePayloadSchema.safeParse({
      taskId: uuid,
      title: "Task",
      assignee_ids: [uuid, uuid],
    });
    expect(result.success).toBe(false);
  });
});

describe("TaskSubmitSchema", () => {
  it("accepts a valid task id", () => {
    const result = TaskSubmitSchema.safeParse({ taskId: uuid });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid task id", () => {
    const result = TaskSubmitSchema.safeParse({ taskId: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("TaskReviewSchema", () => {
  it("accepts accepted/rejected decisions with an optional comment", () => {
    const accepted = TaskReviewSchema.safeParse({ taskId: uuid, decision: "Accepted" });
    const rejected = TaskReviewSchema.safeParse({
      taskId: uuid,
      decision: "Rejected",
      comment: "Needs more work",
    });
    expect(accepted.success).toBe(true);
    expect(rejected.success).toBe(true);
  });

  it("rejects pending and unknown decisions", () => {
    const pending = TaskReviewSchema.safeParse({ taskId: uuid, decision: "Pending" });
    const unknown = TaskReviewSchema.safeParse({ taskId: uuid, decision: "Maybe" });
    expect(pending.success).toBe(false);
    expect(unknown.success).toBe(false);
  });
});

describe("TaskAddReviewerSchema", () => {
  it("accepts task and reviewer ids", () => {
    const result = TaskAddReviewerSchema.safeParse({ taskId: uuid, reviewerUserId: uuid });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid reviewer id", () => {
    const result = TaskAddReviewerSchema.safeParse({ taskId: uuid, reviewerUserId: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("TaskCancelSchema", () => {
  it("accepts a valid task id", () => {
    const result = TaskCancelSchema.safeParse({ taskId: uuid });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid task id", () => {
    const result = TaskCancelSchema.safeParse({ taskId: "abc" });
    expect(result.success).toBe(false);
  });
});
