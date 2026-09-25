import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAuthorizedDocument } from "@/features/documents/queries";
import { requireAuth } from "@/lib/security/auth-guards";
import { ForbiddenError } from "@/lib/security/errors";
import { mockSessionUser } from "@/test-utils/fixtures";

import DocumentPreviewPage from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/lib/security/auth-guards", () => ({ requireAuth: vi.fn() }));
vi.mock("@/features/documents/queries", () => ({ getAuthorizedDocument: vi.fn() }));
vi.mock("@/lib/infra/s3", () => ({
  objectExists: vi.fn(),
  getPresignedFileUrl: vi.fn(),
}));

const documentId = "550e8400-e29b-41d4-a716-446655440000";
const session = mockSessionUser();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAuth).mockResolvedValue(session);
  vi.mocked(getAuthorizedDocument).mockResolvedValue(null);
});

describe("DocumentPreviewPage", () => {
  it("rejects an invalid document ID before lookup", async () => {
    await expect(
      DocumentPreviewPage({ params: Promise.resolve({ documentId: "invalid" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getAuthorizedDocument).not.toHaveBeenCalled();
  });

  it("looks up a valid ID and returns not found when missing", async () => {
    await expect(DocumentPreviewPage({ params: Promise.resolve({ documentId }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(getAuthorizedDocument).toHaveBeenCalledWith(documentId, session);
  });

  it("returns not found when access is forbidden", async () => {
    vi.mocked(getAuthorizedDocument).mockRejectedValue(new ForbiddenError());

    await expect(DocumentPreviewPage({ params: Promise.resolve({ documentId }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("rethrows other lookup errors", async () => {
    const error = new Error("Storage unavailable");
    vi.mocked(getAuthorizedDocument).mockRejectedValue(error);

    await expect(DocumentPreviewPage({ params: Promise.resolve({ documentId }) })).rejects.toBe(
      error,
    );
  });
});
