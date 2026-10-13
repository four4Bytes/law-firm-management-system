// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DocumentRow } from "@/features/documents/queries";

import { useSubtaskDocuments } from "../../../hooks/useSubtaskDocuments";
import { SubtaskFilesSection } from "../SubtaskFilesSection";

vi.mock("../../../hooks/useSubtaskDocuments", () => ({
  useSubtaskDocuments: vi.fn(),
}));

vi.mock("@/features/documents/actions", () => ({
  getDocumentsPaginatedAction: vi.fn(),
  getDocumentUploadUrlAction: vi.fn(),
  confirmDocumentUploadAction: vi.fn(),
  getDocumentDownloadUrlAction: vi.fn(),
  deleteDocumentAction: vi.fn(),
}));

const document: DocumentRow = {
  id: "d1",
  file_name: "annex.pdf",
  file_type: "application/pdf",
  file_size: 1200,
  uploadedBy: "Alice",
  created_at: new Date("2026-10-01T09:00:00+08:00"),
  task: null,
  case: null,
  consultation: null,
};

function mockDocuments(documents: DocumentRow[]) {
  vi.mocked(useSubtaskDocuments).mockReturnValue({
    documents,
    isLoading: false,
    isLoadingMore: false,
    nextCursor: null,
    detailsDocument: null,
    setDetailsDocument: vi.fn(),
    handleDownload: vi.fn(),
    reload: vi.fn(),
    loadMore: vi.fn(),
  });
}

afterEach(cleanup);

describe("SubtaskFilesSection", () => {
  it("loads documents for the subtask and renders each row", () => {
    mockDocuments([document]);
    render(<SubtaskFilesSection subtaskId="st1" canEdit onSuccess={() => {}} />);

    expect(useSubtaskDocuments).toHaveBeenCalledWith("st1");
    expect(screen.getByText("annex.pdf")).not.toBeNull();
  });

  it("shows the dropzone and delete controls when editable", () => {
    mockDocuments([document]);
    render(<SubtaskFilesSection subtaskId="st1" canEdit onSuccess={() => {}} />);

    expect(screen.getByText("Drop files or click to upload")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Delete file" })).not.toBeNull();
  });

  it("hides the dropzone and delete controls when read-only", () => {
    mockDocuments([document]);
    render(<SubtaskFilesSection subtaskId="st1" canEdit={false} onSuccess={() => {}} readOnly />);

    expect(screen.getByText("annex.pdf")).not.toBeNull();
    expect(screen.queryByText("Drop files or click to upload")).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete file" })).toBeNull();
  });
});
