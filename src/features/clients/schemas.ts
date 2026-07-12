import { z } from "zod";

import { ClientDataSchema } from "@/lib/schemas";

export const ClientCreatePayloadSchema = ClientDataSchema;

export type ClientCreatePayload = z.infer<typeof ClientCreatePayloadSchema>;

export const ClientIdSchema = z.object({
  clientId: z.uuid(),
});

export const ClientUpdatePayloadSchema = ClientDataSchema.extend({
  clientId: z.uuid(),
});

export type ClientUpdatePayload = z.infer<typeof ClientUpdatePayloadSchema>;
