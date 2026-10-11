// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { completeSubtaskAction } from "@/features/subtasks/actions";
import type { SubtaskDetailRow } from "@/features/subtasks/queries";
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

function renderModal(subtask: SubtaskDetailRow = detail, readOnly = false) {
  const onOpenChange = vi.fn();
  const onSuccess = vi.fn();
  render(
    <EditSubtaskModal
      isOpen
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
      subtask={subtask}
      readOnly={readOnly}
      users={[]}
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
