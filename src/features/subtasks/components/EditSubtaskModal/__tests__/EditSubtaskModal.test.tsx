// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { completeSubtaskAction, updateSubtaskAction } from "@/features/subtasks/actions";
import type { SubtaskDetailRow } from "@/features/subtasks/queries";
import type { UserSummary } from "@/features/users/types";
import { SubtaskStatus } from "@/generated/prisma/browser";
import { toastActionError, toastSuccess } from "@/lib/hooks/toast-utils";

import { EditSubtaskModal } from "../EditSubtaskModal";

vi.mock("@/features/subtasks/actions", () => ({
  completeSubtaskAction: vi.fn(),
  updateSubtaskAction: vi.fn(),
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

describe("EditSubtaskModal assignee chips", () => {
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

  it("opens with existing assignees as chips and no placeholder", () => {
    renderModal(chipsDetail(), false, assigneeUsers);

    expect(screen.getByRole("button", { name: "Remove Alice" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Remove Bob" })).not.toBeNull();
    expect(screen.queryByText("Select assignees...")).toBeNull();
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

  it("submits the remaining ids after removing a chip", async () => {
    vi.mocked(updateSubtaskAction).mockResolvedValue({ success: true });
    renderModal(chipsDetail(), false, assigneeUsers);

    fireEvent.click(screen.getByRole("button", { name: "Remove Bob" }));
    expect(screen.queryByRole("button", { name: "Remove Bob" })).toBeNull();

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
