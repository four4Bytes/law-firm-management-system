import { z } from "zod";

export const ClientIdSchema = z.object({
  clientId: z.uuid(),
});
