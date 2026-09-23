import { describe, expect, it, vi } from "vitest";

import type { TaskReviewer } from "@/generated/prisma/browser";
import { prisma } from "@/lib/infra/prisma";
import { mockTask as mockBaseTask } from "@/test-utils/fixtures";

import {
  getTaskById,
  getTaskDetailRowById,
  getTaskReviewers,
  getTasksPaginated,
  type TaskDetailRow,
} from "../queries";

vi.mock("@/lib/infra/prisma", () => ({
  prisma: {
    task: { findUnique: vi.fn(), findMany: vi.fn() },
    taskReviewer: { findMany: vi.fn() },
  },
}));

const mockTaskData = (overrides: Record<string, unknown> = {}) => ({
  id: "t1",
  title: "Task title",
  description: "Task description",
  status: "Pending" as const,
  case_id: "c1",
  created_by_user_id: "u1",
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-02"),
  taskAssignments: [{ user_id: "u2", user: { name: "Jane Assignee" }, status: "Todo" as const }],
  taskReviewers: [{ id: "r1", reviewer_user_id: "u3", decision: "Pending", reviewed_at: null }],
  ...overrides,
});

describe("getTaskById", () => {
  it("returns task with joined data", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(mockTaskData());

    const result = await getTaskById("t1");

    expect(result).toMatchObject({
      id: "t1",
      title: "Task title",
      case_id: "c1",
      created_by_user_id: "u1",
      taskAssignments: [
        { user_id: "u2", user: { name: "Jane Assignee" }, status: "Todo" as const },
      ],
      taskReviewers: [{ id: "r1", reviewer_user_id: "u3", decision: "Pending", reviewed_at: null }],
    });
    expect(prisma.task.findUnique).toHaveBeenCalledWith({
      where: { id: "t1" },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        case_id: true,
        created_by_user_id: true,
        created_at: true,
        updated_at: true,
        taskAssignments: {
          select: { user: { select: { name: true } }, user_id: true, status: true },
        },
        taskReviewers: {
          select: {
            id: true,
            reviewer_user_id: true,
            decision: true,
            reviewed_at: true,
          },
        },
      },
    });
  });

  it("returns null when not found", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(null);

    const result = await getTaskById("999");

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.task.findUnique).mockRejectedValue(error);

    await expect(getTaskById("t1")).rejects.toThrow(error);
  });
});

describe("getTaskDetailRowById", () => {
  it("maps to TaskDetailRow shape", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(
      mockTaskData({
        taskReviewers: [
          {
            id: "r1",
            reviewer_user_id: "u3",
            decision: "Approved",
            reviewed_at: new Date("2024-06-03"),
            reviewer: { name: "Carol Reviewer" },
          },
        ],
      }),
    );

    const result = await getTaskDetailRowById("t1");

    const expected: TaskDetailRow = {
      id: "t1",
      title: "Task title",
      description: "Task description",
      status: "Pending",
      assignTo: [{ id: "u2", name: "Jane Assignee", status: "Todo" }],
      assignee_ids: ["u2"],
      reviewers: [
        {
          id: "r1",
          reviewer_user_id: "u3",
          name: "Carol Reviewer",
          decision: "Approved",
          reviewed_at: new Date("2024-06-03"),
        },
      ],
      updated_at: new Date("2024-06-02"),
      created_at: new Date("2024-06-01"),
      created_by_user_id: "u1",
    };
    expect(result).toEqual(expected);
  });

  it("returns null when not found", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue(null);

    const result = await getTaskDetailRowById("999");

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.task.findUnique).mockRejectedValue(error);

    await expect(getTaskDetailRowById("t1")).rejects.toThrow(error);
  });
});

describe("getTaskReviewers", () => {
  it("returns mapped reviewer rows", async () => {
    vi.mocked(prisma.taskReviewer.findMany).mockResolvedValue([
      {
        id: "r1",
        reviewer_user_id: "u3",
        decision: "Pending",
        reviewed_at: null,
        reviewer: { name: "Carol Reviewer" },
      },
    ] as unknown as TaskReviewer[]);

    const result = await getTaskReviewers("t1");

    expect(result).toEqual([
      {
        id: "r1",
        reviewer_user_id: "u3",
        name: "Carol Reviewer",
        decision: "Pending",
        reviewed_at: null,
      },
    ]);
    expect(prisma.taskReviewer.findMany).toHaveBeenCalledWith({
      where: { task_id: "t1" },
      select: {
        id: true,
        reviewer_user_id: true,
        decision: true,
        reviewed_at: true,
        reviewer: { select: { name: true } },
      },
      orderBy: { created_at: "asc" },
    });
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.taskReviewer.findMany).mockRejectedValue(error);

    await expect(getTaskReviewers("t1")).rejects.toThrow(error);
  });
});

describe("getTasksPaginated", () => {
  const mockTask = (overrides: Record<string, unknown> = {}) => ({
    ...mockBaseTask(),
    title: "Draft complaint",
    updated_at: new Date("2024-06-02"),
    taskAssignments: [{ user: { name: "Bob Lawyer" } }],
    taskReviewers: [],
    ...overrides,
  });

  it("returns mapped task rows", async () => {
    const tasks = [
      mockTask(),
      mockTask({
        id: "t2",
        title: "Review evidence",
        taskAssignments: [{ user: { name: "Carol Paralegal" } }],
        taskReviewers: [
          { reviewer: { name: "Alice Reviewer" } },
          { reviewer: { name: "Bob Reviewer" } },
        ],
      }),
    ];
    vi.mocked(prisma.task.findMany).mockResolvedValue(tasks);

    const result = await getTasksPaginated({ caseId: "1", pageSize: 10 });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "t1",
      title: "Draft complaint",
      status: "Pending",
      assignTo: "Bob Lawyer",
      reviewers: "",
      updated_at: tasks[0].updated_at,
    });
    expect(result.rows[1]).toEqual({
      id: "t2",
      title: "Review evidence",
      status: "Pending",
      assignTo: "Carol Paralegal",
      reviewers: "Alice Reviewer, Bob Reviewer",
      updated_at: tasks[1].updated_at,
    });
    expect(prisma.task.findMany).toHaveBeenCalledWith({
      take: 11,
      skip: 0,
      where: { case_id: "1" },
      orderBy: { updated_at: "desc" },
      include: {
        taskAssignments: { include: { user: { select: { name: true } } } },
        taskReviewers: { include: { reviewer: { select: { name: true } } } },
      },
    });
  });

  it("filters by search term", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([mockTask()]);

    await getTasksPaginated({ caseId: "1", search: "draft" });

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { case_id: "1", title: { contains: "draft", mode: "insensitive" } },
      }),
    );
  });

  it("filters by a single status", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([mockTask()]);

    await getTasksPaginated({ caseId: "1", filters: { status: ["Pending"] } });

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { case_id: "1", status: { in: ["Pending"] } },
      }),
    );
  });

  it("filters by multiple statuses", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([mockTask()]);

    await getTasksPaginated({ caseId: "1", filters: { status: ["Pending", "Done"] } });

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { case_id: "1", status: { in: ["Pending", "Done"] } },
      }),
    );
  });

  it("combines status filter with search", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([mockTask()]);

    await getTasksPaginated({
      caseId: "1",
      search: "draft",
      filters: { status: ["InReview"] },
    });

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          case_id: "1",
          title: { contains: "draft", mode: "insensitive" },
          status: { in: ["InReview"] },
        },
      }),
    );
  });

  it("handles cursor pagination", async () => {
    const tasks = Array.from({ length: 4 }, (_, i) => mockTask({ id: String(i + 1) }));
    vi.mocked(prisma.task.findMany).mockResolvedValue(tasks);

    const result = await getTasksPaginated({ caseId: "1", pageSize: 3 });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("returns empty array when no tasks", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);

    const result = await getTasksPaginated({ caseId: "1" });

    expect(result.rows).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("sorts by title ascending", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    await getTasksPaginated({ caseId: "1", sort: { column: "title", direction: "asc" } });
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ title: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by title descending", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    await getTasksPaginated({ caseId: "1", sort: { column: "title", direction: "desc" } });
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ title: "desc" }, { id: "asc" }] }),
    );
  });

  it("sorts by status ascending", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    await getTasksPaginated({ caseId: "1", sort: { column: "status", direction: "asc" } });
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ status: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by updated_at descending", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    await getTasksPaginated({ caseId: "1", sort: { column: "updated_at", direction: "desc" } });
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ updated_at: "desc" }, { id: "asc" }] }),
    );
  });
});
