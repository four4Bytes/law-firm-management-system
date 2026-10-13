// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { completeSubtaskAction, updateSubtaskAction } from "@/features/subtasks/actions";
import type { SubtaskDetailRow } from "@/features/subtasks/queries";
import { getTaskDetailRowByIdAction } from "@/features/tasks/actions";
import type { TaskDetailRow } from "@/features/tasks/queries";
import type { UserSummary } from "@/features/users/types";
import { SubtaskStatus, TaskAssignmentStatus, TaskStatus } from "@/generated/prisma/browser";
import { toastActionError, toastError, toastSuccess } from "@/lib/hooks/toast-utils";

import { EditSubtaskModal } from "../EditSubtaskModal";

vi.mock("@/features/subtasks/actions", () => ({
  completeSubtaskAction: vi.fn(),
  updateSubtaskAction: vi.fn(),
}));

vi.mock("@/features/tasks/actions", () => ({
  getTaskDetailRowByIdAction: vi.fn(),
}));

vi.mock("@/features/notes/actions", () => ({
  getSubtaskNotesPaginatedAction: vi.fn(),
  createNoteAction: vi.fn(),
  updateNoteAction: vi.fn(),
  deleteNoteAction: vi.fn(),
}));

vi.mock("@/features/subtasks/hooks/useSubtaskNotes", () => ({
  useSubtaskNotes: vi.fn().mockReturnValue({
    notes: [],
    isLoading: false,
    isLoadingMore: false,
    nextCursor: null,
    reload: vi.fn(),
    loadMore: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/toast-utils", () => ({
  toastActionError: vi.fn(),
  toastError: vi.fn(),
  toastNotFound: vi.fn(),
  toastSuccess: vi.fn(),
}));

afterEach(cleanup);

const detail: SubtaskDetailRow = {
  id: "st1",
  task_id: "t1",
  title: "File motion",
  description: null,
  status: SubtaskStatus.Pending,
  due_date: new Date("2026-12-01T09:00:00+08:00"),
  created_by_user_id: "u1",
  created_at: new Date("2026-10-01T09:00:00+08:00"),
  updated_at: new Date("2026-10-01T09:00:00+08:00"),
  assignTo: [],
  assignee_ids: [],
  case_id: "c1",
};

function renderModal(
  subtask: SubtaskDetailRow = detail,
  readOnly = false,
  assigneeUsers: UserSummary[] = [],
) {
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();
  render(
    <EditSubtaskModal
      isOpen
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      subtask={subtask}
      readOnly={readOnly}
      users={assigneeUsers}
    />,
  );
  return { onOpenChange, onSuccess };
}

describe("EditSubtaskModal mark complete", () => {
  it("calls completeSubtaskAction with the subtask id and shows a success toast", async () => {
    vi.mocked(completeSubtaskAction).mockResolvedValue({ success: true });
    const { onOpenChange, onSuccess } = renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));

    await waitFor(() => {
      expect(completeSubtaskAction).toHaveBeenCalledWith({ subtaskId: "st1" });
    });
    expect(toastSuccess).toHaveBeenCalledWith(
      "Subtask completed",
      "The subtask has been marked as done.",
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalled();
    expect(toastActionError).not.toHaveBeenCalled();
  });

  it.each([
    { name: "done subtask", subtask: { ...detail, status: SubtaskStatus.Done }, readOnly: false },
    { name: "read-only mode", subtask: detail, readOnly: true },
  ])("hides Mark complete for $name", ({ subtask, readOnly }) => {
    renderModal(subtask, readOnly);
    expect(screen.queryByRole("button", { name: "Mark complete" })).toBeNull();
  });
});

describe("EditSubtaskModal assignee list", () => {
  const ALICE_ID = "11111111-1111-4111-8111-111111111111";
  const BOB_ID = "22222222-2222-4222-8222-222222222222";
  const SUBTASK_ID = "44444444-4444-4111-8111-444444444444";
  const assigneeUsers: UserSummary[] = [
    { id: ALICE_ID, name: "Alice", is_online: true },
    { id: BOB_ID, name: "Bob", is_online: false },
  ];

  function chipsDetail(overrides: Partial<SubtaskDetailRow> = {}): SubtaskDetailRow {
    return {
      ...detail,
      id: SUBTASK_ID,
      due_date: new Date("2099-06-01T09:00:00+08:00"),
      assignee_ids: [ALICE_ID, BOB_ID],
      ...overrides,
    };
  }

  it("opens with existing assignees listed and the placeholder still shown", () => {
    renderModal(chipsDetail(), false, assigneeUsers);

    const list = screen.getByRole("list");
    expect(within(list).getByText("Alice")).not.toBeNull();
    expect(within(list).getByText("Bob")).not.toBeNull();
    expect(screen.getByText("Select assignees...")).not.toBeNull();
    expect(screen.queryByText("No assignees")).toBeNull();
  });

  it("saves the same assignee ids when only the title changes", async () => {
    vi.mocked(updateSubtaskAction).mockResolvedValue({ success: true });
    renderModal(chipsDetail(), false, assigneeUsers);

    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "File amended motion" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateSubtaskAction).toHaveBeenCalledWith(
        expect.objectContaining({ subtaskId: SUBTASK_ID, assignee_ids: [ALICE_ID, BOB_ID] }),
      );
    });
  });

  it("submits the remaining ids after deselecting in the dropdown", async () => {
    vi.mocked(updateSubtaskAction).mockResolvedValue({ success: true });
    renderModal(chipsDetail(), false, assigneeUsers);

    fireEvent.click(screen.getByRole("button", { name: /Assignees/ }));
    await screen.findByRole("option", { name: "Bob" });
    fireEvent.click(screen.getByRole("option", { name: "Bob" }));
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });

    const list = screen.getByRole("list");
    expect(within(list).queryByText("Bob")).toBeNull();
    expect(within(list).getByText("Alice")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateSubtaskAction).toHaveBeenCalledWith(
        expect.objectContaining({ subtaskId: SUBTASK_ID, assignee_ids: [ALICE_ID] }),
      );
    });
  });

  it("lists selected assignees first in the dropdown", async () => {
    renderModal(chipsDetail({ assignee_ids: [BOB_ID] }), false, assigneeUsers);

    fireEvent.click(screen.getByRole("button", { name: /Assignees/ }));
    const options = await screen.findAllByRole("option");

    expect(options).toHaveLength(2);
    expect(options[0]?.textContent).toContain("Bob");
    expect(options[1]?.textContent).toContain("Alice");
  });
});

describe("EditSubtaskModal parent context", () => {
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

  function parentDetail(row: TaskDetailRow) {
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

  it("shows the parent reviewers read-only with no reviewer input", async () => {
    vi.mocked(getTaskDetailRowByIdAction).mockResolvedValue(
      parentDetail(
        parentRow({
          reviewers: [
            {
              id: "r1",
              reviewer_user_id: "u3",
              name: "Atty. Angela Mercado",
              decision: "Pending",
              reviewed_at: null,
            },
          ],
        }),
      ),
    );
    renderModal();

    await waitFor(() => {
      expect(screen.queryByText("Reviewers")).not.toBeNull();
    });
    expect(screen.getByText("(from parent task)")).not.toBeNull();
    expect(screen.getByText("Atty. Angela Mercado")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /Reviewers/ })).toBeNull();
    expect(screen.queryByText("Parent task")).toBeNull();
  });

  it("renders the form and notes columns with no files section", () => {
    renderModal();

    expect(screen.getByRole("textbox", { name: "Title" })).not.toBeNull();
    expect(screen.getByText("Notes")).not.toBeNull();
    expect(screen.queryByText("Files")).toBeNull();
  });

  it("warns on a past-parent deadline but still saves", async () => {
    const aliceId = "11111111-1111-4111-8111-111111111111";
    const subtaskId = "55555555-5555-4555-8555-555555555555";
    vi.mocked(getTaskDetailRowByIdAction).mockResolvedValue(
      parentDetail(parentRow({ due_date: new Date("2020-01-01T09:00:00+08:00") })),
    );
    vi.mocked(updateSubtaskAction).mockResolvedValue({ success: true });
    renderModal({ ...detail, id: subtaskId, assignee_ids: [aliceId] }, false, [
      { id: aliceId, name: "Alice", is_online: true },
    ]);

    await waitFor(() => {
      expect(
        screen.queryByText(/This due date is after the parent task's deadline/),
      ).not.toBeNull();
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "File amended motion" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(updateSubtaskAction).toHaveBeenCalled();
    });
  });

  it("shows the deadline hint whenever the parent has one", async () => {
    vi.mocked(getTaskDetailRowByIdAction).mockResolvedValue(parentDetail(parentRow()));
    renderModal();

    await waitFor(() => {
      expect(screen.queryByText(/Parent task deadline:/)).not.toBeNull();
    });
  });
});

describe("EditSubtaskModal status row", () => {
  it("shows the To Do badge with a success-outlined Mark complete button", () => {
    renderModal();
    expect(screen.getByText("To Do")).not.toBeNull();
    expect(screen.getByText("Status")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Mark complete" })).not.toBeNull();
  });

  it("shows only the Done badge without Mark complete for a done subtask", () => {
    renderModal({ ...detail, status: SubtaskStatus.Done });
    expect(screen.getByText("Done")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Mark complete" })).toBeNull();
  });
});

describe("EditSubtaskModal title validation", () => {
  it("shows an inline required message with alert wiring and no toast on empty save", async () => {
    renderModal();

    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const error = await screen.findByText("Title is required.");
    expect(error.closest('[role="alert"]')).not.toBeNull();
    const input = screen.getByRole("textbox", { name: "Title" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy).toContain(error.id);
    expect(vi.mocked(toastError)).not.toHaveBeenCalled();
    expect(vi.mocked(updateSubtaskAction)).not.toHaveBeenCalled();
  });
});
