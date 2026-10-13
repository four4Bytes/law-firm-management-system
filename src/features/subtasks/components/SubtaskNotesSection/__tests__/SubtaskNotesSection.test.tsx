// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { NoteRow } from "@/features/notes/queries";

import { useSubtaskNotes } from "../../../hooks/useSubtaskNotes";
import { SubtaskNotesSection } from "../SubtaskNotesSection";

vi.mock("../../../hooks/useSubtaskNotes", () => ({
  useSubtaskNotes: vi.fn(),
}));

vi.mock("@/features/notes/actions", () => ({
  getSubtaskNotesPaginatedAction: vi.fn(),
  createNoteAction: vi.fn(),
  updateNoteAction: vi.fn(),
  deleteNoteAction: vi.fn(),
}));

const note: NoteRow = {
  id: "n1",
  content: "Check the annex",
  author: "Alice",
  created_at: new Date("2026-10-01T09:00:00+08:00"),
};

function mockNotes(notes: NoteRow[]) {
  vi.mocked(useSubtaskNotes).mockReturnValue({
    notes,
    isLoading: false,
    isLoadingMore: false,
    nextCursor: null,
    reload: vi.fn(),
    loadMore: vi.fn(),
  });
}

afterEach(cleanup);

describe("SubtaskNotesSection", () => {
  it("loads notes for the subtask and renders each row", () => {
    mockNotes([note]);
    render(<SubtaskNotesSection subtaskId="st1" canEdit onSuccess={() => {}} />);

    expect(useSubtaskNotes).toHaveBeenCalledWith("st1");
    expect(screen.getByText("Check the annex")).not.toBeNull();
  });

  it("opens the Add Note modal from the Add Note button when editable", async () => {
    mockNotes([]);
    render(<SubtaskNotesSection subtaskId="st1" canEdit onSuccess={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Add Note" }));

    expect(await screen.findByRole("button", { name: "Save Note" })).not.toBeNull();
  });

  it("hides add, edit, and delete controls when read-only", () => {
    mockNotes([note]);
    render(<SubtaskNotesSection subtaskId="st1" canEdit={false} onSuccess={() => {}} readOnly />);

    expect(screen.queryByRole("button", { name: "Add Note" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit note: Check the annex" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete note: Check the annex" })).toBeNull();
  });
});
