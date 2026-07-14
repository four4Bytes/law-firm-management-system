"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { createAuditLog } from "@/features/audit/mutations";
import type { Client } from "@/generated/prisma/client";
import type { ActionDataResponse } from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";

import { createClient, updateClient } from "./mutations";
import { getClientForEdit, type ClientEditData } from "./queries";
import { ClientCreatePayloadSchema, ClientIdSchema, ClientUpdatePayloadSchema } from "./schemas";

export type ClientSummary = Pick<Client, "id" | "name">;

export async function createClientAction(
  payload: z.input<typeof ClientCreatePayloadSchema>,
): Promise<ActionDataResponse<ClientSummary>> {
  const session = await requireAuth();

  const parsed = ClientCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid client data" };
  }

  const { name, email, phone_number, address } = parsed.data;

  try {
    const client = await createClient({ name, email, phone_number, address });

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "client.created",
        entityType: "Client",
        entityId: client.id,
        details: `Created client: "${name}"`,
      }).catch(console.error),
    );

    revalidatePath("/client");

    return { success: true, data: client };
  } catch {
    return { success: false, error: "Failed to create client" };
  }
}

export async function getClientForEditAction(id: string): Promise<ClientEditData | null> {
  await requireAuth();

  const parsed = ClientIdSchema.safeParse({ clientId: id });
  if (!parsed.success) {
    throw new Error("Invalid client ID");
  }

  return getClientForEdit(parsed.data.clientId);
}

export async function updateClientAction(
  payload: z.input<typeof ClientUpdatePayloadSchema>,
): Promise<ActionDataResponse<ClientSummary>> {
  const session = await requireAuth();

  const parsed = ClientUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid client data" };
  }

  const { clientId, name, email, phone_number, address } = parsed.data;

  try {
    const client = await updateClient({ clientId, name, email, phone_number, address });

    after(() =>
      createAuditLog({
        actorUserId: session.id,
        action: "client.updated",
        entityType: "Client",
        entityId: clientId,
        details: `Updated client: "${name}"`,
      }).catch(console.error),
    );

    revalidatePath("/client");

    return { success: true, data: client };
  } catch {
    return { success: false, error: "Failed to update client" };
  }
}
