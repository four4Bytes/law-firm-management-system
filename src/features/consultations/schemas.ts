import { z } from "zod";

import { ConsultationStatus } from "@/generated/prisma/browser";
import { requiredEnum, requiredText, uniqueUuidArray } from "@/lib/form-utils";
import { ClientDataSchema, SortQuerySchema } from "@/lib/schemas";

export const ConsultationPageQuerySchema = z.object({
  consultationId: z.uuid(),
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: SortQuerySchema.optional(),
});

export const ConsultationOverviewIdSchema = z.object({
  consultationId: z.uuid(),
});

const ConsultationCreateStatusSchema = z.enum([
  ConsultationStatus.Scheduled,
  ConsultationStatus.Completed,
]);

export const ConsultationCreatePayloadSchema = z.object({
  client_id: z.uuid(),
  concern: requiredText(500, "Concern"),
  booking_datetime: z.coerce.date(),
  status: ConsultationCreateStatusSchema,
  assignee_ids: uniqueUuidArray("Assignee").optional(),
});

export const ConsultationUpdatePayloadSchema = z.object({
  consultationId: z.uuid(),
  client_id: z.uuid(),
  concern: requiredText(500, "Concern"),
  booking_datetime: z.coerce.date(),
  assignee_ids: uniqueUuidArray("Assignee").optional(),
});

export const ConsultationDeletePayloadSchema = z.object({
  consultationId: z.uuid(),
});

const ConsultationCreateDataSchema = z.object({
  concern: requiredText(500, "Concern"),
  booking_datetime: z.coerce.date(),
  status: ConsultationCreateStatusSchema,
  assignee_ids: uniqueUuidArray("Assignee").optional(),
});

const ConsultationUpdateDataSchema = z.object({
  concern: requiredText(500, "Concern"),
  booking_datetime: z.coerce.date(),
  assignee_ids: uniqueUuidArray("Assignee").optional(),
});

export const ConsultationStatusChangePayloadSchema = z.object({
  consultationId: z.uuid(),
  status: requiredEnum(ConsultationStatus, "Status"),
});

export const ConsultationWithClientCreatePayloadSchema = z.object({
  client: ClientDataSchema,
  consultation: ConsultationCreateDataSchema,
});

export const ConsultationWithClientUpdatePayloadSchema = z.object({
  consultation_id: z.uuid(),
  client_id: z.uuid(),
  client: ClientDataSchema,
  consultation: ConsultationUpdateDataSchema,
});

export type ConsultationCreatePayload = z.infer<typeof ConsultationCreatePayloadSchema>;
export type ConsultationUpdatePayload = z.infer<typeof ConsultationUpdatePayloadSchema>;
export type ConsultationDeletePayload = z.infer<typeof ConsultationDeletePayloadSchema>;
export type ConsultationWithClientCreatePayload = z.infer<
  typeof ConsultationWithClientCreatePayloadSchema
>;
export type ConsultationWithClientUpdatePayload = z.infer<
  typeof ConsultationWithClientUpdatePayloadSchema
>;
