import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { getDocumentById, getDocumentsPaginated } from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: { document: { findMany: vi.fn(), findUnique: vi.fn() } },
}));

const mockDocument = (overrides: Record<string, unknown> = {}) => ({
  id: "d1",
  file_name: "complaint.pdf",
  file_path: "uploads/complaint.pdf",
  file_type: "application/pdf",
  file_size: 2500000,
  case_id: "c1",
  consultation_id: null,
  task_id: null,
  uploaded_by_user_id: "u1",
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  uploadedBy: { name: "John Lawyer" },
  ...overrides,
});

describe("getDocumentsPaginated", () => {
  it("returns mapped document rows", async () => {
    const documents = [
      mockDocument(),
      mockDocument({
        id: "d2",
        file_name: "evidence.zip",
        uploadedBy: { name: "Alice Paralegal" },
      }),
    ];
    vi.mocked(prisma.document.findMany).mockResolvedValue(documents);

    const result = await getDocumentsPaginated({ pageSize: 10 });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "d1",
      file_name: "complaint.pdf",
      file_type: "application/pdf",
      file_size: 2500000,
      uploadedBy: "John Lawyer",
      created_at: documents[0].created_at,
    });
    expect(result.rows[1]).toEqual({
      id: "d2",
      file_name: "evidence.zip",
      file_type: "application/pdf",
      file_size: 2500000,
      uploadedBy: "Alice Paralegal",
      created_at: documents[1].created_at,
    });
    expect(prisma.document.findMany).toHaveBeenCalledWith({
      take: 11,
      skip: 0,
      where: {},
      orderBy: { created_at: "desc" },
      include: { uploadedBy: { select: { name: true } } },
    });
  });

  it("filters by case_id", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([mockDocument()]);

    await getDocumentsPaginated({ caseId: "c1" });

    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { case_id: "c1" },
      }),
    );
  });

  it("filters by consultation_id", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([mockDocument()]);

    await getDocumentsPaginated({ consultationId: "con1" });

    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { consultation_id: "con1" },
      }),
    );
  });

  it("filters by file_name search", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([mockDocument()]);

    await getDocumentsPaginated({ search: "complaint" });

    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { file_name: { contains: "complaint", mode: "insensitive" } },
      }),
    );
  });

  it("handles cursor pagination", async () => {
    const docs = Array.from({ length: 4 }, (_, i) => mockDocument({ id: String(i + 1) }));
    vi.mocked(prisma.document.findMany).mockResolvedValue(docs);

    const result = await getDocumentsPaginated({ pageSize: 3 });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("returns empty when none exist", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([]);

    const result = await getDocumentsPaginated({});

    expect(result.rows).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.document.findMany).mockRejectedValue(error);

    await expect(getDocumentsPaginated({})).rejects.toThrow(error);
  });

  it("sorts by file_name ascending", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([]);
    await getDocumentsPaginated({ sort: { column: "file_name", direction: "asc" } });
    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ file_name: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by file_name descending", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([]);
    await getDocumentsPaginated({ sort: { column: "file_name", direction: "desc" } });
    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ file_name: "desc" }, { id: "asc" }] }),
    );
  });

  it("sorts by file_type ascending", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([]);
    await getDocumentsPaginated({ sort: { column: "file_type", direction: "asc" } });
    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ file_type: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by file_size descending", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([]);
    await getDocumentsPaginated({ sort: { column: "file_size", direction: "desc" } });
    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ file_size: "desc" }, { id: "asc" }] }),
    );
  });

  it("sorts by created_at ascending", async () => {
    vi.mocked(prisma.document.findMany).mockResolvedValue([]);
    await getDocumentsPaginated({ sort: { column: "created_at", direction: "asc" } });
    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ created_at: "asc" }, { id: "asc" }] }),
    );
  });
});

describe("getDocumentById", () => {
  it("returns document when found", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(mockDocument());

    const result = await getDocumentById("d1");

    expect(result).toMatchObject({ id: "d1", file_name: "complaint.pdf" });
    expect(prisma.document.findUnique).toHaveBeenCalledWith({
      where: { id: "d1" },
      select: {
        id: true,
        file_path: true,
        file_name: true,
        case_id: true,
        consultation_id: true,
      },
    });
  });

  it("returns null when not found", async () => {
    vi.mocked(prisma.document.findUnique).mockResolvedValue(null);

    const result = await getDocumentById("999");

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.document.findUnique).mockRejectedValue(error);

    await expect(getDocumentById("d1")).rejects.toThrow(error);
  });
});
