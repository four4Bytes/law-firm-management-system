import { z } from "zod";

import { ConsultationStatus } from "@/generated/prisma/browser";
import { SortQuerySchema } from "@/lib/schemas";

export const ConsultationPageQuerySchema = z.object({
  consultationId: z.uuid(),
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: SortQuerySchema.optional(),
});

export const ConsultationOverviewIdSchema = z.object({
  id: z.uuid(),
});

export const ConsultationCreatePayloadSchema = z.object({
  client_id: z.uuid(),
  concern: z.string().trim().min(1).max(500),
  booking_datetime: z.coerce.date(),
  status: z.enum(ConsultationStatus),
});

export const ConsultationUpdatePayloadSchema = ConsultationCreatePayloadSchema.extend({
  id: z.uuid(),
});

export const ConsultationDeletePayloadSchema = z.object({
  id: z.uuid(),
});

export const ConsultationWithClientCreatePayloadSchema = z.object({
  client: z.object({
    name: z.string().trim().min(1).max(255),
    email: z.string().trim().min(1).max(255).optional(),
    phone_number: z.string().trim().min(1).max(50).optional(),
    address: z.string().trim().min(1).max(500).optional(),
  }),
  consultation: z.object({
    concern: z.string().trim().min(1).max(500),
    booking_datetime: z.coerce.date(),
    status: z.enum(ConsultationStatus),
  }),
});

export const ConsultationWithClientUpdatePayloadSchema = z.object({
  consultation_id: z.uuid(),
  client_id: z.uuid(),
  client: z.object({
    name: z.string().trim().min(1).max(255),
    email: z.string().trim().min(1).max(255).optional(),
    phone_number: z.string().trim().min(1).max(50).optional(),
    address: z.string().trim().min(1).max(500).optional(),
  }),
  consultation: z.object({
    concern: z.string().trim().min(1).max(500),
    booking_datetime: z.coerce.date(),
    status: z.enum(ConsultationStatus),
  }),
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
