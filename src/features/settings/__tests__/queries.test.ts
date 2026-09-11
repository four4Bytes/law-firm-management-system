import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { getNotificationPreferences, getNotificationPreferencesByUserIds } from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: { userSettings: { findUnique: vi.fn(), findMany: vi.fn() } },
}));

describe("getNotificationPreferences", () => {
  it("returns defaults when no settings row exists", async () => {
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValue(null);

    const result = await getNotificationPreferences("user-1");

    expect(result).toEqual({
      notify_email_case_assigned: true,
      notify_email_consultation_assigned: true,
      notify_email_task_assigned: true,
    });
    expect(prisma.userSettings.findUnique).toHaveBeenCalledWith({
      where: { user_id: "user-1" },
      select: {
        notify_email_case_assigned: true,
        notify_email_consultation_assigned: true,
        notify_email_task_assigned: true,
      },
    });
  });

  it("returns stored preferences when row exists", async () => {
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({
      notify_email_case_assigned: false,
      notify_email_consultation_assigned: true,
      notify_email_task_assigned: false,
    } as unknown as never);

    const result = await getNotificationPreferences("user-1");

    expect(result).toEqual({
      notify_email_case_assigned: false,
      notify_email_consultation_assigned: true,
      notify_email_task_assigned: false,
    });
  });

  it("propagates database errors", async () => {
    vi.mocked(prisma.userSettings.findUnique).mockRejectedValue(new Error("db failed"));

    await expect(getNotificationPreferences("user-1")).rejects.toThrow("db failed");
  });
});

describe("getNotificationPreferencesByUserIds", () => {
  it("returns empty map without querying when no ids", async () => {
    const result = await getNotificationPreferencesByUserIds([]);

    expect(result.size).toBe(0);
    expect(prisma.userSettings.findMany).not.toHaveBeenCalled();
  });

  it("returns defaults for users without rows and stored prefs for others", async () => {
    vi.mocked(prisma.userSettings.findMany).mockResolvedValue([
      {
        user_id: "u1",
        notify_email_case_assigned: false,
        notify_email_consultation_assigned: true,
        notify_email_task_assigned: true,
      } as unknown as never,
    ]);

    const result = await getNotificationPreferencesByUserIds(["u1", "u2"]);

    expect(result.get("u1")).toEqual({
      notify_email_case_assigned: false,
      notify_email_consultation_assigned: true,
      notify_email_task_assigned: true,
    });
    expect(result.get("u2")).toEqual({
      notify_email_case_assigned: true,
      notify_email_consultation_assigned: true,
      notify_email_task_assigned: true,
    });
  });

  it("returns stored prefs for all users when all have rows", async () => {
    vi.mocked(prisma.userSettings.findMany).mockResolvedValue([
      {
        user_id: "u1",
        notify_email_case_assigned: false,
        notify_email_consultation_assigned: false,
        notify_email_task_assigned: false,
      } as unknown as never,
      {
        user_id: "u2",
        notify_email_case_assigned: true,
        notify_email_consultation_assigned: true,
        notify_email_task_assigned: true,
      } as unknown as never,
    ]);

    const result = await getNotificationPreferencesByUserIds(["u1", "u2"]);

    expect(result.get("u1")?.notify_email_case_assigned).toBe(false);
    expect(result.get("u2")?.notify_email_case_assigned).toBe(true);
  });

  it("propagates database errors", async () => {
    vi.mocked(prisma.userSettings.findMany).mockRejectedValue(new Error("db failed"));

    await expect(getNotificationPreferencesByUserIds(["u1"])).rejects.toThrow("db failed");
  });
});
