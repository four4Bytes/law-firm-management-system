// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createSubtaskAction } from "@/features/subtasks/actions";
import { getTaskDetailRowByIdAction } from "@/features/tasks/actions";
import type { TaskDetailRow } from "@/features/tasks/queries";
import type { UserSummary } from "@/features/users/types";
import { TaskAssignmentStatus, TaskStatus } from "@/generated/prisma/browser";
import { formatDateTime } from "@/lib/primitives/date";

import { AddSubtaskModal } from "../AddSubtaskModal";

vi.mock("@/features/subtasks/actions", () => ({
  createSubtaskAction: vi.fn(),
}));

vi.mock("@/features/tasks/actions", () => ({
  getTaskDetailRowByIdAction: vi.fn(),
}));

vi.mock("@/lib/hooks/toast-utils", () => ({
  toastActionError: vi.fn(),
  toastError: vi.fn(),
  toastNotFound: vi.fn(),
  toastSuccess: vi.fn(),
}));

afterEach(cleanup);

function parentRow(overrides: Partial<TaskDetailRow> = {}): TaskDetailRow {
  return {
    id: "t1",
    title: "Parent task",
    description: null,
    status: TaskStatus.Pending,
    due_date: new Date("2099-06-01T09:00:00+08:00"),
    assignTo: [{ id: "u1", name: "Alice", status: TaskAssignmentStatus.Todo }],
    assignee_ids: ["u1"],
    reviewers: [],
    updated_at: new Date("2026-10-01T09:00:00+08:00"),
    created_at: new Date("2026-10-01T09:00:00+08:00"),
    created_by_user_id: "u9",
    ...overrides,
  };
}

function detailResult(row: TaskDetailRow) {
  return {
    row,
    canUpdate: false,
    capabilities: {
      isCreator: false,
      isReviewer: false,
      canSubmit: false,
      canReview: false,
      canManageReviewers: false,
      canEdit: false,
      canEditRoster: false,
      canReopen: false,
    },
    currentUserId: "u9",
  };
}

function renderModal() {
  render(
    <AddSubtaskModal isOpen onOpenChange={() => {}} onSuccess={() => {}} taskId="t1" users={[]} />,
  );
}

describe("AddSubtaskModal parent header", () => {
  it("shows the parent title, deadline, and assignees", async () => {
    const row = parentRow();
    vi.mocked(getTaskDetailRowByIdAction).mockResolvedValue(detailResult(row));

    renderModal();

    await waitFor(() => {
      expect(screen.queryByText("Parent task")).not.toBeNull();
    });
    expect(screen.getByText(formatDateTime(row.due_date as Date))).not.toBeNull();
    expect(screen.getByText("Alice")).not.toBeNull();
  });

  it("shows No deadline when the parent has no due date", async () => {
    vi.mocked(getTaskDetailRowByIdAction).mockResolvedValue(
      detailResult(parentRow({ due_date: null })),
    );

    renderModal();

    await waitFor(() => {
      expect(screen.queryByText("No deadline")).not.toBeNull();
    });
  });
});

describe("AddSubtaskModal parent warning", () => {
  it("shows a warning box when the chosen due date exceeds the parent deadline", async () => {
    vi.mocked(getTaskDetailRowByIdAction).mockResolvedValue(
      detailResult(parentRow({ due_date: new Date("2020-01-01T09:00:00+08:00") })),
    );

    renderModal();

    await waitFor(() => {
      expect(screen.queryByText(/Exceeds parent deadline/)).not.toBeNull();
    });
  });

  it("shows no warning when within the parent deadline", async () => {
    vi.mocked(getTaskDetailRowByIdAction).mockResolvedValue(detailResult(parentRow()));

    renderModal();

    await waitFor(() => {
      expect(screen.queryByText("Parent task")).not.toBeNull();
    });
    expect(screen.queryByText(/Exceeds parent deadline/)).toBeNull();
  });
});

describe("AddSubtaskModal assignee chips", () => {
  const ALICE_ID = "11111111-1111-4111-8111-111111111111";
  const BOB_ID = "22222222-2222-4222-8222-222222222222";
  const TASK_ID = "33333333-3333-4333-8333-333333333333";
  const assigneeUsers: UserSummary[] = [
    { id: ALICE_ID, name: "Alice", is_online: true },
    { id: BOB_ID, name: "Bob", is_online: false },
  ];

  function renderChipsModal() {
    vi.mocked(getTaskDetailRowByIdAction).mockResolvedValue(
      detailResult(
        parentRow({
          assignTo: [],
          assignee_ids: [],
          due_date: new Date("2099-06-01T09:00:00+08:00"),
        }),
      ),
    );
    render(
      <AddSubtaskModal
        isOpen
        onOpenChange={() => {}}
        onSuccess={() => {}}
        taskId={TASK_ID}
        users={assigneeUsers}
      />,
    );
  }

  async function openAssigneeOptions() {
    fireEvent.click(screen.getByRole("button", { name: /Assignees/ }));
    await screen.findByRole("option", { name: "Alice" });
  }

  function closeAssigneeOptions() {
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
  }

  it("shows a chip and hides the placeholder after selecting an assignee", async () => {
    renderChipsModal();
    expect(screen.getByText("Select assignees...")).not.toBeNull();

    await openAssigneeOptions();
    fireEvent.click(screen.getByRole("option", { name: "Alice" }));
    closeAssigneeOptions();

    expect(await screen.findByRole("button", { name: "Remove Alice" })).not.toBeNull();
    expect(screen.queryByText("Select assignees...")).toBeNull();
  });

  it("removes the chip and submits the remaining ids", async () => {
    vi.mocked(createSubtaskAction).mockResolvedValue({ success: true });
    renderChipsModal();

    await openAssigneeOptions();
    fireEvent.click(screen.getByRole("option", { name: "Alice" }));
    fireEvent.click(screen.getByRole("option", { name: "Bob" }));
    closeAssigneeOptions();
    fireEvent.click(await screen.findByRole("button", { name: "Remove Alice" }));

    expect(screen.queryByRole("button", { name: "Remove Alice" })).toBeNull();
    expect(screen.getByRole("button", { name: "Remove Bob" })).not.toBeNull();

    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Draft motion" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Subtask" }));

    await waitFor(() => {
      expect(createSubtaskAction).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: TASK_ID, assignee_ids: [BOB_ID] }),
      );
    });
  });
});
