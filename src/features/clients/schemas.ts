import { z } from "zod";

import {
  emailText,
  optionalText,
  phoneNumberText,
  requiredText,
} from "@/lib/validation/form-utils";

export const ClientDataSchema = z.object({
  name: requiredText(255, "Client name"),
  email: emailText("Email").optional(),
  phone_number: phoneNumberText(),
  address: optionalText(500, "Address"),
});

export type EmbeddedClientData = z.infer<typeof ClientDataSchema>;

export interface EmbeddedClientUpdatePayload {
  clientId: string;
  client: EmbeddedClientData;
}

export const ClientIdSchema = z.object({
  clientId: z.uuid(),
});
