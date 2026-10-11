// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getTaskDetailRowByIdAction } from "@/features/tasks/actions";
import type { TaskDetailRow } from "@/features/tasks/queries";
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
