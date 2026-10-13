// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    title: "Wala",
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
    expect(screen.getByText("Wala")).not.toBeNull();
    expect(
      screen.queryByText(`Due ${formatDateTime(row.due_date as Date)} · Assigned to Alice`),
    ).not.toBeNull();
  });

  it("shows No deadline when the parent has no due date", async () => {
    vi.mocked(getTaskDetailRowByIdAction).mockResolvedValue(
      detailResult(parentRow({ due_date: null })),
    );

    renderModal();

    await waitFor(() => {
      expect(screen.queryByText("Parent task")).not.toBeNull();
    });
    expect(screen.queryByText(/No deadline/)).not.toBeNull();
  });
});

describe("AddSubtaskModal parent warning", () => {
  it("shows a warning box when the chosen due date exceeds the parent deadline", async () => {
    vi.mocked(getTaskDetailRowByIdAction).mockResolvedValue(
      detailResult(parentRow({ due_date: new Date("2020-01-01T09:00:00+08:00") })),
    );

    renderModal();

    await waitFor(() => {
      expect(
        screen.queryByText(
          "This due date is after the parent task's deadline (Jan 1). You can still save it.",
        ),
      ).not.toBeNull();
    });
  });

  it("shows no warning when within the parent deadline", async () => {
    vi.mocked(getTaskDetailRowByIdAction).mockResolvedValue(detailResult(parentRow()));

    renderModal();

    await waitFor(() => {
      expect(screen.queryByText("Parent task")).not.toBeNull();
    });
    expect(screen.queryByText(/This due date is after the parent task's deadline/)).toBeNull();
  });

  it("always shows the parent deadline hint when the parent has one", async () => {
    const row = parentRow();
    vi.mocked(getTaskDetailRowByIdAction).mockResolvedValue(detailResult(row));

    renderModal();

    await waitFor(() => {
      expect(screen.queryByText(/Parent task deadline:/)).not.toBeNull();
    });
  });

  it("shows no deadline hint when the parent has none", async () => {
    vi.mocked(getTaskDetailRowByIdAction).mockResolvedValue(
      detailResult(parentRow({ due_date: null })),
    );

    renderModal();

    await waitFor(() => {
      expect(screen.queryByText("Parent task")).not.toBeNull();
    });
    expect(screen.queryByText(/Parent task deadline:/)).toBeNull();
  });
});

describe("AddSubtaskModal required title marker", () => {
  it("marks the title label with a hidden-from-assistive-tech asterisk", async () => {
    vi.mocked(getTaskDetailRowByIdAction).mockResolvedValue(detailResult(parentRow()));
    renderModal();

    await waitFor(() => {
      expect(screen.queryByText("Parent task")).not.toBeNull();
    });
    const asterisk = screen.getByText("*", { selector: "span" });
    expect(asterisk.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("AddSubtaskModal title validation", () => {
  it("shows an inline required message with no toast on empty submit", async () => {
    vi.mocked(getTaskDetailRowByIdAction).mockResolvedValue(detailResult(parentRow()));
    const { toastError } = await import("@/lib/hooks/toast-utils");

    renderModal();

    await waitFor(() => {
      expect(screen.queryByText("Parent task")).not.toBeNull();
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const error = await screen.findByText("Title is required.");
    expect(error.closest('[role="alert"]')).not.toBeNull();
    const input = screen.getByRole("textbox", { name: "Title" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy).toContain(error.id);
    expect(vi.mocked(toastError)).not.toHaveBeenCalled();
    expect(vi.mocked(createSubtaskAction)).not.toHaveBeenCalled();
  });
});

describe("AddSubtaskModal assignee list", () => {
  const ALICE_ID = "11111111-1111-4111-8111-111111111111";
  const BOB_ID = "22222222-2222-4222-8222-222222222222";
  const TASK_ID = "33333333-3333-4333-8333-333333333333";
  const assigneeUsers: UserSummary[] = [
    { id: ALICE_ID, name: "Alice", is_online: true },
    { id: BOB_ID, name: "Bob", is_online: false },
  ];

  function renderListModal() {
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

  it("lists the chosen person under the field and keeps the placeholder", async () => {
    renderListModal();
    expect(screen.getByText("Select assignees...")).not.toBeNull();
    expect(screen.getByText("No assignees")).not.toBeNull();

    await openAssigneeOptions();
    fireEvent.click(screen.getByRole("option", { name: "Alice" }));
    closeAssigneeOptions();

    expect(screen.queryByText("No assignees")).toBeNull();
    expect(screen.getByText("Select assignees...")).not.toBeNull();
  });

  it("keeps the chosen people listed after the dropdown closes", async () => {
    renderListModal();
    await openAssigneeOptions();
    fireEvent.click(screen.getByRole("option", { name: "Alice" }));
    fireEvent.click(screen.getByRole("option", { name: "Bob" }));
    closeAssigneeOptions();

    const list = screen.getByRole("list");
    expect(within(list).getByText("Alice")).not.toBeNull();
    expect(within(list).getByText("Bob")).not.toBeNull();
  });

  it("deselecting in the dropdown removes the row and submits the remaining ids", async () => {
    vi.mocked(createSubtaskAction).mockResolvedValue({ success: true });
    renderListModal();
    await openAssigneeOptions();
    fireEvent.click(screen.getByRole("option", { name: "Alice" }));
    fireEvent.click(screen.getByRole("option", { name: "Bob" }));
    closeAssigneeOptions();
    expect(within(screen.getByRole("list")).getByText("Alice")).not.toBeNull();
    await openAssigneeOptions();
    fireEvent.click(screen.getByRole("option", { name: "Alice" }));
    closeAssigneeOptions();

    const list = screen.getByRole("list");
    expect(within(list).queryByText("Alice")).toBeNull();
    expect(within(list).getByText("Bob")).not.toBeNull();

    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Draft motion" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(createSubtaskAction).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: TASK_ID, assignee_ids: [BOB_ID] }),
      );
    });
  });

  it("renders single-column with no Notes or Files sections", () => {
    renderModal();

    expect(screen.getByRole("textbox", { name: "Title" })).not.toBeNull();
    expect(screen.queryByText("Notes")).toBeNull();
    expect(screen.queryByText("Files")).toBeNull();
  });
});
