"use server";

import { revalidatePath } from "next/cache";

import type { ActionDataResponse } from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";

import { createClient, updateClient } from "./mutations";
import { getClientForEdit, type ClientEditData } from "./queries";
import { ClientCreatePayloadSchema, ClientIdSchema, ClientUpdatePayloadSchema } from "./schemas";

type ClientCreateResult = { id: string; name: string };

export async function createClientAction(
  payload: unknown,
): Promise<ActionDataResponse<ClientCreateResult>> {
  await requireAuth();

  const parsed = ClientCreatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid client data" };
  }

  const { name, email, phone_number, address } = parsed.data;

  try {
    const client = await createClient({ name, email, phone_number, address });

    revalidatePath("/client");

    return { success: true, data: client };
  } catch {
    return { success: false, error: "Failed to create client" };
  }
}

export async function getClientForEditAction(id: string): Promise<ClientEditData | null> {
  await requireAuth();

  const parsed = ClientIdSchema.safeParse({ id });
  if (!parsed.success) {
    throw new Error("Invalid client ID");
  }

  return getClientForEdit(parsed.data.id);
}

export async function updateClientAction(
  payload: unknown,
): Promise<ActionDataResponse<ClientCreateResult>> {
  await requireAuth();

  const parsed = ClientUpdatePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Invalid client data" };
  }

  const { id, name, email, phone_number, address } = parsed.data;

  try {
    const client = await updateClient({ id, name, email, phone_number, address });

    revalidatePath("/client");

    return { success: true, data: client };
  } catch {
    return { success: false, error: "Failed to update client" };
  }
}
