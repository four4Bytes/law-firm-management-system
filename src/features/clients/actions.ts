"use server";

import { revalidatePath } from "next/cache";

import type { ActionDataResponse } from "@/lib/action-response";
import { requireAuth } from "@/lib/auth-guards";

import { createClient, updateClient } from "./mutations";
import { getClientForEdit } from "./queries";
import { ClientCreatePayloadSchema, ClientUpdatePayloadSchema } from "./schemas";

export async function createClientAction(
  payload: unknown,
): Promise<ActionDataResponse<{ id: string; name: string }>> {
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

export async function getClientForEditAction(id: string): Promise<
  ActionDataResponse<{
    id: string;
    name: string;
    email: string | null;
    phone_number: string | null;
    address: string | null;
  }>
> {
  await requireAuth();

  if (!id) {
    return { success: false, error: "Client id is required" };
  }

  try {
    const client = await getClientForEdit(id);
    if (!client) {
      return { success: false, error: "Client not found" };
    }

    return { success: true, data: client };
  } catch {
    return { success: false, error: "Failed to load client" };
  }
}

export async function updateClientAction(
  payload: unknown,
): Promise<ActionDataResponse<{ id: string; name: string }>> {
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
