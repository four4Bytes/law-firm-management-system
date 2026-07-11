import { z } from "zod";

export const ClientCreatePayloadSchema = z.object({
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().max(255).optional(),
  phone_number: z.string().trim().max(50).optional(),
  address: z.string().trim().max(500).optional(),
});

export type ClientCreatePayload = z.infer<typeof ClientCreatePayloadSchema>;

export const ClientUpdatePayloadSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().max(255).optional(),
  phone_number: z.string().trim().max(50).optional(),
  address: z.string().trim().max(500).optional(),
});

export type ClientUpdatePayload = z.infer<typeof ClientUpdatePayloadSchema>;
