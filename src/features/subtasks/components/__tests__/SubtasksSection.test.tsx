import { readFileSync } from "node:fs";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { SubtaskStatus } from "@/generated/prisma/browser";

import type { SubtaskRow } from "../../queries";
import { SubtasksSection } from "../SubtasksSection/SubtasksSection";

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

  it("guards subtask delete against duplicate submits while busy", () => {
    const source = readFileSync(
      new URL("../SubtasksSection/SubtasksSection.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain("if (!deleteTarget || busyId) return");
  });
});
