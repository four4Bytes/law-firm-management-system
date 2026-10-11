import { describe, expect, it } from "vitest";

import {
  SubtaskCompleteSchema,
  SubtaskCreatePayloadSchema,
  SubtaskIdSchema,
  SubtaskUpdatePayloadSchema,
} from "../schemas";

const uuid = "550e8400-e29b-41d4-a716-446655440000";
const dueDate = new Date("2026-12-01T09:00:00+08:00");

describe("SubtaskIdSchema", () => {
  it("accepts a valid uuid", () => {
    expect(SubtaskIdSchema.safeParse({ subtaskId: uuid }).success).toBe(true);
  });

  it("rejects a non-uuid string", () => {
    expect(SubtaskIdSchema.safeParse({ subtaskId: "abc" }).success).toBe(false);
  });
});

describe("SubtaskCreatePayloadSchema", () => {
  it("rejects blank title and missing due date (TC-081)", () => {
    const r = SubtaskCreatePayloadSchema.safeParse({ taskId: uuid, title: "   " });
    expect(r.success).toBe(false);
  });

  it("rejects a missing due date (TC-081)", () => {
    const r = SubtaskCreatePayloadSchema.safeParse({
      taskId: uuid,
      title: "Subtask",
      assignee_ids: [uuid],
    });
    expect(r.success).toBe(false);
  });

  it("rejects an empty assignee list (TC-081)", () => {
    const r = SubtaskCreatePayloadSchema.safeParse({
      taskId: uuid,
      title: "Subtask",
      due_date: dueDate,
      assignee_ids: [],
    });
    expect(r.success).toBe(false);
  });

  it("rejects a non-uuid task id (TC-081)", () => {
    const r = SubtaskCreatePayloadSchema.safeParse({
      taskId: "abc",
      title: "Subtask",
      due_date: dueDate,
      assignee_ids: [uuid],
    });
    expect(r.success).toBe(false);
  });

  it("accepts a minimal valid payload", () => {
    const r = SubtaskCreatePayloadSchema.safeParse({
      taskId: uuid,
      title: "Subtask",
      due_date: dueDate,
      assignee_ids: [uuid],
    });
    expect(r.success).toBe(true);
  });
});

describe("SubtaskUpdatePayloadSchema", () => {
  it("accepts a valid payload without assignees", () => {
    const r = SubtaskUpdatePayloadSchema.safeParse({
      subtaskId: uuid,
      title: "Updated subtask",
      due_date: dueDate,
    });
    expect(r.success).toBe(true);
  });

  it("rejects a blank title", () => {
    const r = SubtaskUpdatePayloadSchema.safeParse({
      subtaskId: uuid,
      title: "   ",
      due_date: dueDate,
    });
    expect(r.success).toBe(false);
  });
});

describe("SubtaskCompleteSchema", () => {
  it("accepts a valid subtask id", () => {
    expect(SubtaskCompleteSchema.safeParse({ subtaskId: uuid }).success).toBe(true);
  });

  it("rejects a non-uuid subtask id", () => {
    expect(SubtaskCompleteSchema.safeParse({ subtaskId: "abc" }).success).toBe(false);
  });
});
