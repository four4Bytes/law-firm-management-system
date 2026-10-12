// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteSubtaskAction,
  getSubtaskCountsByTaskIdsAction,
  getSubtasksByTaskAction,
} from "@/features/subtasks/actions";
import subtaskStyles from "@/features/subtasks/components/TaskSubtaskRows/TaskSubtaskRows.module.css";
import type { SubtaskRow } from "@/features/subtasks/queries";
import { getTasksPaginatedAction } from "@/features/tasks/actions";
import type { TaskRow } from "@/features/tasks/queries";
import { Role, SubtaskStatus, TaskStatus } from "@/generated/prisma/browser";

import { TasksTab } from "../TasksTab";

vi.mock("@/features/tasks/actions", () => ({
  deleteTaskAction: vi.fn(),
  getTaskDetailRowByIdAction: vi.fn(),
  getTasksPaginatedAction: vi.fn(),
}));

vi.mock("@/features/subtasks/actions", () => ({
  createSubtaskAction: vi.fn(),
  updateSubtaskAction: vi.fn(),
  deleteSubtaskAction: vi.fn(),
  completeSubtaskAction: vi.fn(),
  getSubtaskDetailAction: vi.fn(),
  getSubtasksByTaskAction: vi.fn(),
  getSubtaskCountsByTaskIdsAction: vi.fn(),
}));

vi.mock("@/features/users/actions", () => ({
  getActiveUsersAction: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/notes/actions", () => ({
  getTaskNotesPaginatedAction: vi.fn(),
  deleteNoteAction: vi.fn(),
  createNoteAction: vi.fn(),
  updateNoteAction: vi.fn(),
}));

vi.mock("@/features/documents/actions", () => ({
  getDocumentsPaginatedAction: vi.fn(),
  deleteDocumentAction: vi.fn(),
  getDocumentDownloadUrlAction: vi.fn(),
}));

afterEach(cleanup);

const taskRow: TaskRow = {
  id: "t1",
  title: "Task 1",
  status: TaskStatus.Pending,
  due_date: null,
  assignTo: "Alice",
  reviewers: "Bob",
  updated_at: new Date("2026-10-01T09:00:00+08:00"),
};

const subtask: SubtaskRow = {
  id: "st1",
  title: "File motion",
  status: SubtaskStatus.Pending,
  due_date: new Date("2026-12-01T09:00:00+08:00"),
  created_at: new Date("2026-10-01T09:00:00+08:00"),
  assignTo: "Alice",
};

function renderTab() {
  render(
    <TasksTab
      caseId="c1"
      access={{ assigned: true, own: false, taskOnly: false }}
      userRole={Role.Admin}
      currentUserId="u1"
    />,
  );
}

describe("TasksTab subtask expansion", () => {
  beforeEach(() => {
    vi.mocked(getTasksPaginatedAction).mockResolvedValue({ rows: [taskRow], nextCursor: null });
    vi.mocked(getSubtaskCountsByTaskIdsAction).mockResolvedValue({ t1: 2 });
    vi.mocked(getSubtasksByTaskAction).mockResolvedValue([subtask]);
  });

  it("fetches subtask counts once per page with the visible task ids", async () => {
    renderTab();
    await waitFor(() =>
      expect(getSubtaskCountsByTaskIdsAction).toHaveBeenCalledWith({
        caseId: "c1",
        taskIds: ["t1"],
      }),
    );
    expect(vi.mocked(getSubtaskCountsByTaskIdsAction).mock.calls.length).toBe(1);
    expect(await screen.findByText("2 subtasks")).not.toBeNull();
  });

  it("expands a task to show its subtasks fetched exactly once", async () => {
    renderTab();
    const toggle = await screen.findByLabelText("Expand subtasks for Task 1");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(await screen.findByText("File motion")).not.toBeNull();
    expect(getSubtasksByTaskAction).toHaveBeenCalledWith({ taskId: "t1" });
    expect(vi.mocked(getSubtasksByTaskAction).mock.calls.length).toBe(1);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("removes the count pill after deleting the last subtask but keeps the chevron and empty state", async () => {
    vi.mocked(getSubtaskCountsByTaskIdsAction)
      .mockResolvedValueOnce({ t1: 2 })
      .mockResolvedValue({});
    vi.mocked(getSubtasksByTaskAction).mockResolvedValueOnce([subtask]).mockResolvedValue([]);
    vi.mocked(deleteSubtaskAction).mockResolvedValue({ success: true });
    renderTab();
    expect(await screen.findByText("2 subtasks")).not.toBeNull();
    fireEvent.click(await screen.findByLabelText("Expand subtasks for Task 1"));
    expect(await screen.findByText("File motion")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Delete subtask" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete subtask" }));
    await waitFor(() => expect(screen.queryByText("2 subtasks")).toBeNull());
    expect(screen.queryByText("1 subtask")).toBeNull();
    expect(document.querySelector(`.${subtaskStyles.countPill}`)).toBeNull();
    const toggle = screen.getByLabelText("Expand subtasks for Task 1");
    expect(toggle.getAttribute("aria-expanded")).not.toBeNull();
    const empties = screen.getAllByText("No subtasks yet");
    expect(empties).toHaveLength(1);
    expect(empties[0].className).toContain(subtaskStyles.emptyMessage);
    expect(screen.getByRole("button", { name: "Add subtask" })).not.toBeNull();
  });

  it("toggles expansion on task row click", async () => {
    renderTab();
    await screen.findByLabelText("Expand subtasks for Task 1");
    fireEvent.click(screen.getByText("Task 1"));
    expect(await screen.findByText("File motion")).not.toBeNull();
    fireEvent.click(screen.getByText("Task 1"));
    await waitFor(() => expect(screen.queryByText("File motion")).toBeNull());
  });

  it.each(["View task", "Edit task", "Delete task"])(
    "does not toggle on %s click",
    async (label) => {
      renderTab();
      await screen.findByLabelText("Expand subtasks for Task 1");
      fireEvent.click(screen.getByLabelText(label));
      expect(screen.queryByText("File motion")).toBeNull();
      expect(
        screen.getByLabelText("Expand subtasks for Task 1").getAttribute("aria-expanded"),
      ).toBe("false");
    },
  );

  it("does not collapse when clicking a subtask row", async () => {
    renderTab();
    fireEvent.click(await screen.findByLabelText("Expand subtasks for Task 1"));
    expect(await screen.findByText("File motion")).not.toBeNull();
    fireEvent.click(screen.getByText("File motion"));
    expect(screen.getByText("File motion")).not.toBeNull();
    expect(screen.getByLabelText("Expand subtasks for Task 1").getAttribute("aria-expanded")).toBe(
      "true",
    );
  });

  it("shows exactly one Add button opening the modal when subtasks exist", async () => {
    renderTab();
    fireEvent.click(await screen.findByLabelText("Expand subtasks for Task 1"));
    expect(await screen.findByText("File motion")).not.toBeNull();
    expect(screen.getAllByRole("button", { name: "Add subtask" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Add subtask" }));
    expect(await screen.findByText("Add Subtask")).not.toBeNull();
  });

  it("shows exactly one Add button opening the modal when empty", async () => {
    vi.mocked(getSubtasksByTaskAction).mockResolvedValue([]);
    renderTab();
    fireEvent.click(await screen.findByLabelText("Expand subtasks for Task 1"));
    expect(await screen.findByText("No subtasks yet")).not.toBeNull();
    expect(screen.getAllByRole("button", { name: "Add subtask" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Add subtask" }));
    expect(await screen.findByText("Add Subtask")).not.toBeNull();
  });

  it("marks the expanded parent row and styles subtask cells distinctly", async () => {
    renderTab();
    fireEvent.click(await screen.findByLabelText("Expand subtasks for Task 1"));
    expect(await screen.findByText("File motion")).not.toBeNull();
    const parentRow = screen.getByText("Task 1").closest("tr");
    expect(parentRow?.className).toContain(subtaskStyles.expandedParent);
    const badge = screen.getByText("To Do");
    expect(badge.className).toContain(subtaskStyles.smallBadge);
    const reviewers = screen.getByTitle("Reviewers of the parent task");
    expect(reviewers.className).toContain(subtaskStyles.muted);
  });

  it("shows the parent reviewers on subtask rows with an explanatory title", async () => {
    renderTab();
    fireEvent.click(await screen.findByLabelText("Expand subtasks for Task 1"));
    const cell = await screen.findByTitle("Reviewers of the parent task");
    expect(cell.textContent).toBe("Bob");
  });

  it("shows a muted dash when the parent has no reviewers", async () => {
    vi.mocked(getTasksPaginatedAction).mockResolvedValue({
      rows: [{ ...taskRow, reviewers: "" }],
      nextCursor: null,
    });
    renderTab();
    fireEvent.click(await screen.findByLabelText("Expand subtasks for Task 1"));
    const cell = await screen.findByTitle("Reviewers of the parent task");
    expect(cell.textContent).toBe("–");
    expect(cell.className).toContain(subtaskStyles.muted);
  });

  it("renders overdue subtask dates in error color with a middle-dot suffix", async () => {
    vi.mocked(getSubtasksByTaskAction).mockResolvedValue([
      { ...subtask, id: "st-past", due_date: new Date("2020-01-09T09:00:00+08:00") },
    ]);
    renderTab();
    fireEvent.click(await screen.findByLabelText("Expand subtasks for Task 1"));
    const marker = await screen.findByText(/· Overdue/);
    expect(marker.textContent).toMatch(/Overdue/);
  });

  it("renders subtask due dates without the time", async () => {
    renderTab();
    fireEvent.click(await screen.findByLabelText("Expand subtasks for Task 1"));
    expect(await screen.findByText("Dec 1, 2026")).not.toBeNull();
    expect(screen.queryByText(/Dec 1, 2026 at/)).toBeNull();
  });
});
