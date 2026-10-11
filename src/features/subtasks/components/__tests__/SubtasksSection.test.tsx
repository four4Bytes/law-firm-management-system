import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SubtaskStatus } from "@/generated/prisma/browser";

import type { SubtaskRow } from "../../queries";
import { runExclusiveAction, SubtasksSection } from "../SubtasksSection/SubtasksSection";

vi.mock("@/features/subtasks/actions", () => ({
  completeSubtaskAction: vi.fn(),
  createSubtaskAction: vi.fn(),
  deleteSubtaskAction: vi.fn(),
  getSubtaskDetailAction: vi.fn(),
  getSubtasksByTaskAction: vi.fn().mockResolvedValue([]),
  updateSubtaskAction: vi.fn(),
}));

vi.mock("@/features/tasks/actions", () => ({
  getTaskDetailRowByIdAction: vi.fn(),
}));

vi.mock("@/features/users/actions", () => ({
  getActiveUsersAction: vi.fn().mockResolvedValue([]),
}));

const overdueRow: SubtaskRow = {
  id: "st1",
  title: "Overdue subtask",
  status: SubtaskStatus.Pending,
  due_date: new Date("2020-01-01T09:00:00+08:00"),
  created_at: new Date("2019-12-01T09:00:00+08:00"),
  assignTo: "Alice",
};

describe("SubtasksSection", () => {
  it("shows Overdue badge for past-due pending subtask", () => {
    const html = renderToStaticMarkup(
      <SubtasksSection taskId="t1" canEdit={false} initialRows={[overdueRow]} />,
    );
    expect(html).toContain("Overdue");
  });

  it("hides the Add button when canEdit is false", () => {
    const html = renderToStaticMarkup(
      <SubtasksSection taskId="t1" canEdit={false} initialRows={[overdueRow]} />,
    );
    expect(html).not.toContain("Add Subtask");
  });

  it("shows the Add button when canEdit is true", () => {
    const html = renderToStaticMarkup(<SubtasksSection taskId="t1" canEdit={true} />);
    expect(html).toContain("Add Subtask");
  });

  it("always renders row actions even when canEdit is false", () => {
    const html = renderToStaticMarkup(
      <SubtasksSection taskId="t1" canEdit={false} initialRows={[overdueRow]} />,
    );
    expect(html).toContain('aria-label="View subtask"');
    expect(html).toContain('aria-label="Edit subtask"');
    expect(html).toContain('aria-label="Complete subtask"');
    expect(html).toContain('aria-label="Delete subtask"');
  });

  it("shows assignee names for each row", () => {
    const html = renderToStaticMarkup(
      <SubtasksSection taskId="t1" canEdit={false} initialRows={[overdueRow]} />,
    );
    expect(html).toContain("Alice");
  });
});

describe("runExclusiveAction", () => {
  it("executes run exactly once on concurrent double-invoke", async () => {
    const setBusyId = vi.fn();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const run = vi.fn(() => gate);
    const first = runExclusiveAction(null, "st1", setBusyId, run);
    const second = runExclusiveAction("st1", "st1", setBusyId, run);
    release();
    await Promise.all([first, second]);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("sets busy id then clears it", async () => {
    const setBusyId = vi.fn();
    await runExclusiveAction(null, "st1", setBusyId, async () => {});
    expect(setBusyId.mock.calls).toEqual([["st1"], [null]]);
  });

  it("returns without running when occupied", async () => {
    const setBusyId = vi.fn();
    const run = vi.fn();
    await runExclusiveAction("other", "st1", setBusyId, run);
    expect(run).not.toHaveBeenCalled();
    expect(setBusyId).not.toHaveBeenCalled();
  });

  it("clears busy and propagates when run throws", async () => {
    const setBusyId = vi.fn();
    await expect(
      runExclusiveAction(null, "st1", setBusyId, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(setBusyId.mock.calls).toEqual([["st1"], [null]]);
  });
});
