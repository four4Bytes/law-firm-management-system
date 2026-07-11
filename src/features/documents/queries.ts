import { cache } from "react";

import { prisma } from "@/lib/prisma";
import type { PageQuery } from "@/lib/types";

export type DocumentRow = {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  uploadedBy: string;
  created_at: Date;
};

export interface DocumentPageQuery extends PageQuery {
  caseId?: string;
  consultationId?: string;
}

export const getDocumentsPaginated = cache(
  async ({
    caseId,
    consultationId,
    search = "",
    cursor,
    pageSize = 20,
    sort,
  }: DocumentPageQuery): Promise<{
    rows: DocumentRow[];
    nextCursor: string | null;
  }> => {
    const where: Record<string, unknown> = {};
    if (caseId) where.case_id = caseId;
    if (consultationId) where.consultation_id = consultationId;
    if (search) {
      where.file_name = { contains: search, mode: "insensitive" as const };
    }

    const defaultOrderBy = { created_at: "desc" } as const;

    const orderBy =
      sort?.column === "file_name"
        ? [{ file_name: sort.direction }, { id: "asc" as const }]
        : sort?.column === "file_type"
          ? [{ file_type: sort.direction }, { id: "asc" as const }]
          : sort?.column === "file_size"
            ? [{ file_size: sort.direction }, { id: "asc" as const }]
            : sort?.column === "created_at"
              ? [{ created_at: sort.direction }, { id: "asc" as const }]
              : defaultOrderBy;

    const documents = await prisma.document.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy,
      include: {
        uploadedBy: { select: { name: true } },
      },
    });

    const hasMore = documents.length > pageSize;
    if (hasMore) documents.pop();

    const rows: DocumentRow[] = documents.map((d) => ({
      id: d.id,
      file_name: d.file_name,
      file_type: d.file_type,
      file_size: d.file_size,
      uploadedBy: d.uploadedBy.name,
      created_at: d.created_at,
    }));

    return {
      rows,
      nextCursor: hasMore ? documents[documents.length - 1].id : null,
    };
  },
);

export const getDocumentById = cache(
  async (
    id: string,
  ): Promise<{
    id: string;
    file_path: string;
    file_name: string;
    case_id: string | null;
    consultation_id: string | null;
  } | null> => {
    return prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        file_path: true,
        file_name: true,
        case_id: true,
        consultation_id: true,
      },
    });
  },
);

export type DocumentDetailRow = {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  uploadedBy: string;
  created_at: Date;
  case_id: string | null;
  consultation_id: string | null;
};

export const getDocumentDetailRowById = cache(
  async (id: string): Promise<DocumentDetailRow | null> => {
    const doc = await prisma.document.findUnique({
      where: { id },
      select: {
        id: true,
        file_name: true,
        file_type: true,
        file_size: true,
        case_id: true,
        consultation_id: true,
        created_at: true,
        uploadedBy: { select: { name: true } },
      },
    });

    if (!doc) return null;

    return {
      id: doc.id,
      file_name: doc.file_name,
      file_type: doc.file_type,
      file_size: doc.file_size,
      uploadedBy: doc.uploadedBy.name,
      created_at: doc.created_at,
      case_id: doc.case_id,
      consultation_id: doc.consultation_id,
    };
  },
);
