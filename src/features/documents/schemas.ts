import { z } from "zod";

import { isAcceptedFileExtension } from "@/lib/files/file-types";
import { getAppMaxUploadBytes } from "@/lib/files/upload-policy";
import { requiredText } from "@/lib/validation/form-utils";
import { exactlyOneOf, SortQuerySchema } from "@/lib/validation/schemas";

export const DocumentListQuerySchema = z
  .object({
    caseId: z.uuid().optional(),
    consultationId: z.uuid().optional(),
    taskId: z.uuid().optional(),
    search: z.string().trim().max(500).optional().default(""),
    cursor: z.uuid().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
    sort: SortQuerySchema.optional(),
  })
  .refine((data) => exactlyOneOf(data, ["caseId", "consultationId", "taskId"]), {
    message: "Provide exactly one of caseId, consultationId, or taskId",
  });

export const DocumentUploadPayloadSchema = z
  .object({
    file_name: requiredText(500, "File name"),
    file_type: requiredText(100, "File type"),
    case_id: z.uuid().nullable().optional(),
    consultation_id: z.uuid().nullable().optional(),
    task_id: z.uuid().nullable().optional(),
  })
  .refine((data) => exactlyOneOf(data, ["case_id", "consultation_id", "task_id"]), {
    message: "Provide exactly one of case_id, consultation_id, or task_id",
  })
  .refine((data) => isAcceptedFileExtension(data.file_name), {
    message: "Unsupported file type",
    path: ["file_name"],
  });

export const DocumentConfirmPayloadSchema = z
  .object({
    file_name: requiredText(500, "File name"),
    file_type: requiredText(100, "File type"),
    file_size: z.coerce.number().int().positive().max(getAppMaxUploadBytes(), {
      message: "File is larger than the maximum upload size",
    }),
    file_path: requiredText(1000, "File path"),
    case_id: z.uuid().nullable().optional(),
    consultation_id: z.uuid().nullable().optional(),
    task_id: z.uuid().nullable().optional(),
  })
  .refine((data) => exactlyOneOf(data, ["case_id", "consultation_id", "task_id"]), {
    message: "Provide exactly one of case_id, consultation_id, or task_id",
  })
  .refine((data) => isAcceptedFileExtension(data.file_name), {
    message: "Unsupported file type",
    path: ["file_name"],
  });

export const DocumentIdSchema = z.object({
  documentId: z.uuid(),
});
