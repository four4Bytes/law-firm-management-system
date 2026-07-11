import { beforeEach, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { createTask, deleteTask, updateTask } from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: { task: { create: vi.fn(), update: vi.fn(), delete: vi.fn() } },
}));

const mockTask = (overrides: Record<string, unknown> = {}) => ({
  id: "t1",
  case_id: "c1",
  title: "Task title",
  description: null,
  status: "Pending" as const,
  created_by_user_id: "u1",
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
});

it("creates a task", async () => {
  vi.mocked(prisma.task.create).mockResolvedValue(mockTask());

  const result = await createTask({
    title: "Task title",
    status: "Pending",
    case_id: "c1",
    created_by_user_id: "u1",
  });

  expect(result.id).toBe("t1");
  expect(prisma.task.create).toHaveBeenCalledWith({
    data: {
      title: "Task title",
      status: "Pending",
      case_id: "c1",
      created_by_user_id: "u1",
    },
    select: { id: true },
  });
});

it("creates a task with assignees", async () => {
  vi.mocked(prisma.task.create).mockResolvedValue(mockTask());

  const result = await createTask({
    title: "Task with assignees",
    status: "Ongoing",
    case_id: "c1",
    created_by_user_id: "u1",
    assignee_ids: ["u2", "u3"],
  });

  expect(result.id).toBe("t1");
  expect(prisma.task.create).toHaveBeenCalledWith({
    data: {
      title: "Task with assignees",
      status: "Ongoing",
      case_id: "c1",
      created_by_user_id: "u1",
      taskAssignments: {
        create: [{ user_id: "u2" }, { user_id: "u3" }],
      },
    },
    select: { id: true },
  });
});

it("creates a task with optional description", async () => {
  vi.mocked(prisma.task.create).mockResolvedValue(mockTask());

  await createTask({
    title: "Task with description",
    description: "A description",
    status: "Pending",
    case_id: "c1",
    created_by_user_id: "u1",
  });

  expect(prisma.task.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ description: "A description" }),
    select: { id: true },
  });
});

it("updates a task", async () => {
  vi.mocked(prisma.task.update).mockResolvedValue(mockTask());

  const result = await updateTask("t1", { title: "Updated title" });

  expect(result.id).toBe("t1");
  expect(prisma.task.update).toHaveBeenCalledWith({
    where: { id: "t1" },
    data: { title: "Updated title" },
    select: { id: true },
  });
});

it("updates a task with assignee sync", async () => {
  vi.mocked(prisma.task.update).mockResolvedValue(mockTask());

  await updateTask("t1", {
    title: "Updated",
    status: "Accepted",
    assignee_ids: ["u2"],
  });

  expect(prisma.task.update).toHaveBeenCalledWith({
    where: { id: "t1" },
    data: {
      title: "Updated",
      status: "Accepted",
      taskAssignments: {
        deleteMany: {},
        create: [{ user_id: "u2" }],
      },
    },
    select: { id: true },
  });
});

it("deletes a task", async () => {
  vi.mocked(prisma.task.delete).mockResolvedValue(mockTask());

  const result = await deleteTask("t1");

  expect(result.id).toBe("t1");
  expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: "t1" }, select: { id: true } });
});

it("propagates error when deleting nonexistent task", async () => {
  const error = new Error("Record not found");
  vi.mocked(prisma.task.delete).mockRejectedValue(error);

  await expect(deleteTask("999")).rejects.toThrow(error);
});

it("propagates error when creating task fails", async () => {
  const error = new Error("Database connection failed");
  vi.mocked(prisma.task.create).mockRejectedValue(error);

  await expect(
    createTask({
      title: "Task title",
      status: "Pending",
      case_id: "c1",
      created_by_user_id: "u1",
    }),
  ).rejects.toThrow(error);
});

it("propagates error when updating nonexistent task", async () => {
  const error = new Error("Record not found");
  vi.mocked(prisma.task.update).mockRejectedValue(error);

  await expect(updateTask("999", { title: "Updated title" })).rejects.toThrow(error);
});
