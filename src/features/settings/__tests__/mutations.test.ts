import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { upsertNotificationPreferences } from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: { userSettings: { upsert: vi.fn() } },
}));

describe("upsertNotificationPreferences", () => {
  it("upserts a single field and returns preferences", async () => {
    vi.mocked(prisma.userSettings.upsert).mockResolvedValue({
      notify_email_case_assigned: false,
      notify_email_consultation_assigned: true,
      notify_email_task_assigned: true,
    } as unknown as never);

    const result = await upsertNotificationPreferences("u1", { notify_email_case_assigned: false });

    expect(result).toEqual({
      notify_email_case_assigned: false,
      notify_email_consultation_assigned: true,
      notify_email_task_assigned: true,
    });
    expect(prisma.userSettings.upsert).toHaveBeenCalledWith({
      where: { user_id: "u1" },
      update: { notify_email_case_assigned: false },
      create: { user_id: "u1", notify_email_case_assigned: false },
      select: {
        notify_email_case_assigned: true,
        notify_email_consultation_assigned: true,
        notify_email_task_assigned: true,
      },
    });
  });

  it("upserts multiple fields", async () => {
    vi.mocked(prisma.userSettings.upsert).mockResolvedValue({
      notify_email_case_assigned: false,
      notify_email_consultation_assigned: false,
      notify_email_task_assigned: false,
    } as unknown as never);

    const result = await upsertNotificationPreferences("u1", {
      notify_email_case_assigned: false,
      notify_email_consultation_assigned: false,
      notify_email_task_assigned: false,
    });

    expect(result.notify_email_task_assigned).toBe(false);
  });

  it("propagates database errors", async () => {
    vi.mocked(prisma.userSettings.upsert).mockRejectedValue(new Error("db failed"));

    await expect(
      upsertNotificationPreferences("u1", { notify_email_case_assigned: true }),
    ).rejects.toThrow("db failed");
  });
});
