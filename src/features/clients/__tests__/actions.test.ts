import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAuditLog } from "@/features/audit/mutations";
import { Client } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";

import { createClientAction, getClientForEditAction, updateClientAction } from "../actions";

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u1", email: "e", role: "admin", name: "n" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/server", () => ({
  after: vi.fn(),
}));

vi.mock("@/features/audit/mutations", () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: { create: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  },
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

const clientRecord: Client = {
  id: "1",
  name: "Alice Client",
  email: "alice@email.com",
  phone_number: "09170000001",
  address: "123 Rizal St.",
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-06-01"),
};

/**
 * The `after()` callbacks scheduled by the actions module are fire-and-forget:
 * our `next/server` mock records them but never invokes them. To exercise the
 * audit log logic they schedule, we grab the callbacks passed to `after` and
 * invoke them ourselves.
 */
async function runScheduledAfterCallbacks() {
  const calls = vi.mocked(after).mock.calls;
  await Promise.all(calls.map(([callback]) => callback()));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createClientAction", () => {
  it("returns an error for an invalid payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await createClientAction({} as any)).toEqual({
      success: false,
      error: "Invalid client data",
    });
  });

  it("creates a client and revalidates the list", async () => {
    vi.mocked(prisma.client.create).mockResolvedValue(clientRecord);

    const result = await createClientAction({ name: "Alice Client" });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: "1", name: "Alice Client" });
    expect(prisma.client.create).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/client");
  });

  it("schedules an audit log entry via after() for the created client", async () => {
    vi.mocked(prisma.client.create).mockResolvedValue(clientRecord);

    await createClientAction({ name: "Alice Client" });

    expect(after).toHaveBeenCalledTimes(1);
    await runScheduledAfterCallbacks();

    expect(createAuditLog).toHaveBeenCalledWith({
      actorUserId: "u1",
      action: "client.created",
      entityType: "Client",
      entityId: clientRecord.id,
      details: 'Created client: "Alice Client"',
    });
  });

  it("does not throw when the scheduled audit log write fails", async () => {
    vi.mocked(prisma.client.create).mockResolvedValue(clientRecord);
    vi.mocked(createAuditLog).mockRejectedValue(new Error("audit failure"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await createClientAction({ name: "Alice Client" });

    await expect(runScheduledAfterCallbacks()).resolves.not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("returns an error when creation fails", async () => {
    vi.mocked(prisma.client.create).mockRejectedValue(new Error("db error"));

    expect(await createClientAction({ name: "Alice Client" })).toEqual({
      success: false,
      error: "Failed to create client",
    });
  });
});

describe("getClientForEditAction", () => {
  it("throws when id is missing", async () => {
    await expect(getClientForEditAction("")).rejects.toThrow("Invalid client ID");
  });

  it("returns null when the client is not found", async () => {
    vi.mocked(prisma.client.findUnique).mockResolvedValue(null);

    expect(await getClientForEditAction(uuid)).toBeNull();
  });

  it("returns the client edit data", async () => {
    vi.mocked(prisma.client.findUnique).mockResolvedValue(clientRecord);

    const result = await getClientForEditAction(uuid);

    expect(result).toMatchObject({ id: "1", name: "Alice Client" });
  });

  it("throws when loading the client fails", async () => {
    vi.mocked(prisma.client.findUnique).mockRejectedValue(new Error("db error"));

    await expect(getClientForEditAction(uuid)).rejects.toThrow();
  });
});

describe("updateClientAction", () => {
  it("returns an error for an invalid payload", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await updateClientAction({ clientId: uuid } as any)).toEqual({
      success: false,
      error: "Invalid client data",
    });
  });

  it("updates a client and revalidates the list", async () => {
    vi.mocked(prisma.client.update).mockResolvedValue(clientRecord);

    const result = await updateClientAction({ clientId: uuid, name: "Alice Client" });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ id: "1", name: "Alice Client" });
    expect(prisma.client.update).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/client");
  });

  it("schedules an audit log entry via after() for the updated client", async () => {
    vi.mocked(prisma.client.update).mockResolvedValue(clientRecord);

    await updateClientAction({ clientId: uuid, name: "Alice Client" });

    expect(after).toHaveBeenCalledTimes(1);
    await runScheduledAfterCallbacks();

    expect(createAuditLog).toHaveBeenCalledWith({
      actorUserId: "u1",
      action: "client.updated",
      entityType: "Client",
      entityId: uuid,
      details: 'Updated client: "Alice Client"',
    });
  });

  it("returns an error when update fails", async () => {
    vi.mocked(prisma.client.update).mockRejectedValue(new Error("db error"));

    expect(await updateClientAction({ clientId: uuid, name: "Alice Client" })).toEqual({
      success: false,
      error: "Failed to update client",
    });
  });
});
