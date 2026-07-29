import { prisma } from "@/lib/prisma";

export interface DocumentCreatePayload {
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  case_id?: string | null;
  consultation_id?: string | null;
  task_id?: string | null;
  uploaded_by_user_id: string;
}

export async function createDocument(params: DocumentCreatePayload): Promise<{ id: string }> {
  return prisma.document.create({ data: params, select: { id: true } });
}

export async function deleteDocument(id: string): Promise<{ id: string }> {
  return prisma.document.delete({ where: { id }, select: { id: true } });
}
