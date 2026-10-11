import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { SubtaskStatus } from "@/generated/prisma/browser";
import { prisma } from "@/lib/infra/prisma";
import { mockSubtask } from "@/test-utils/fixtures";

import { completeSubtask, createSubtask, deleteSubtask, updateSubtask } from "../mutations";

vi.mock("@/lib/infra/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    subtask: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    subtaskAssignment: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
}));

type Tx = {
  subtask: unknown;
  subtaskAssignment: unknown;
};

const tx: Tx = {
  subtask: prisma.subtask,
  subtaskAssignment: prisma.subtaskAssignment,
};

const transactionMock = vi.mocked(prisma.$transaction) as unknown as Mock<
  (fn: (tx: Tx) => Promise<unknown>) => Promise<unknown>
>;

beforeEach(() => {
  vi.clearAllMocks();
  transactionMock.mockImplementation((fn) => fn(tx as never));
});

describe("createSubtask", () => {
  it("creates a subtask with nested assignment creates", async () => {
    vi.mocked(prisma.subtask.create).mockResolvedValue(mockSubtask());
    const due_date = new Date("2026-12-01T09:00:00+08:00");

    const result = await createSubtask({
      taskId: "t1",
      title: "Subtask",
      description: null,
      due_date,
      assignee_ids: ["u1", "u2"],
      createdBy: "u9",
    });

    expect(result.id).toBe("st1");
    expect(prisma.subtask.create).toHaveBeenCalledWith({
      data: {
        task_id: "t1",
        title: "Subtask",
        description: null,
        due_date,
        created_by_user_id: "u9",
        assignments: { create: [{ user_id: "u1" }, { user_id: "u2" }] },
      },
      select: { id: true },
    });
  });
});

describe("updateSubtask", () => {
  it("updates fields without touching the roster when assignee_ids is omitted", async () => {
    const due_date = new Date("2026-12-01T09:00:00+08:00");

    await updateSubtask({ subtaskId: "st1", title: "Updated", description: null, due_date });

    expect(prisma.subtask.update).toHaveBeenCalledWith({
      where: { id: "st1" },
      data: { title: "Updated", description: null, due_date },
    });
    expect(prisma.subtaskAssignment.deleteMany).not.toHaveBeenCalled();
    expect(prisma.subtaskAssignment.createMany).not.toHaveBeenCalled();
  });

  it("syncs the roster when assignee_ids is provided", async () => {
    const due_date = new Date("2026-12-01T09:00:00+08:00");

    await updateSubtask({
      subtaskId: "st1",
      title: "Updated",
      description: null,
      due_date,
      assignee_ids: ["u1", "u3"],
    });

    expect(prisma.subtaskAssignment.deleteMany).toHaveBeenCalledWith({
      where: { subtask_id: "st1" },
    });
    expect(prisma.subtaskAssignment.createMany).toHaveBeenCalledWith({
      data: [
        { subtask_id: "st1", user_id: "u1" },
        { subtask_id: "st1", user_id: "u3" },
      ],
    });
  });
});

describe("completeSubtask", () => {
  it("sets Done with completed_at/by (TC-083)", async () => {
    vi.mocked(prisma.subtask.update).mockResolvedValue(mockSubtask({ status: SubtaskStatus.Done }));
    await completeSubtask({ subtaskId: "st1", userId: "u9" });
    expect(vi.mocked(prisma.subtask.update).mock.calls[0][0].data).toEqual(
      expect.objectContaining({ status: SubtaskStatus.Done, completed_by_user_id: "u9" }),
    );
  });
});

describe("deleteSubtask", () => {
  it("deletes the subtask row", async () => {
    vi.mocked(prisma.subtask.delete).mockResolvedValue(mockSubtask());

    await deleteSubtask({ subtaskId: "st1" });

    expect(prisma.subtask.delete).toHaveBeenCalledWith({ where: { id: "st1" } });
  });
});
