import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";

import { deleteTaskAction } from "../actions";

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u1", email: "e", role: "admin", name: "n" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: { findUnique: vi.fn(), delete: vi.fn() },
  },
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

const taskRecord: Prisma.TaskGetPayload<{
  select: {
    id: true;
    title: true;
    description: true;
    status: true;
    case_id: true;
    created_at: true;
    updated_at: true;
    created_by_user_id: true;
    taskAssignments: {
      select: { user: { select: { name: true } }; user_id: true };
    };
  };
}> = {
  id: uuid,
  title: "File motion",
  description: null,
  status: "Pending",
  case_id: "c1",
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  created_by_user_id: "u1",
  taskAssignments: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteTaskAction", () => {
  it("returns an error for an invalid payload", async () => {
    expect(await deleteTaskAction("")).toEqual({
      success: false,
      error: "Invalid task ID",
    });
  });

  it("returns an error for a non-uuid taskId", async () => {
    expect(await deleteTaskAction("abc")).toEqual({
      success: false,
      error: "Invalid task ID",
    });
  });

  it("returns an error when the task is not found", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(null);

    expect(await deleteTaskAction(uuid)).toEqual({
      success: false,
      error: "Task not found",
    });
  });

  it("deletes the task and revalidates the case path", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(taskRecord);

    const result = await deleteTaskAction(uuid);

    expect(result).toEqual({ success: true });
    expect(prisma.task.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: uuid } }));
    expect(revalidatePath).toHaveBeenCalledWith("/case/c1");
  });

  it("returns an error when deletion fails", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(taskRecord);
    vi.mocked(prisma.task.delete).mockRejectedValue(new Error("db error"));

    expect(await deleteTaskAction(uuid)).toEqual({
      success: false,
      error: "Failed to delete task",
    });
  });
});