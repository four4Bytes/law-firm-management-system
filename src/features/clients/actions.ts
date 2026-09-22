"use server";

import { requireAuth } from "@/lib/auth-guards";

import { getClientForEdit, type ClientEditData } from "./queries";
import { ClientIdSchema } from "./schemas";

export async function getClientForEditAction(id: string): Promise<ClientEditData | null> {
  await requireAuth();

  const parsed = ClientIdSchema.safeParse({ clientId: id });
  if (!parsed.success) {
    throw new Error("Invalid client ID");
  }

  return getClientForEdit(parsed.data.clientId);
}
