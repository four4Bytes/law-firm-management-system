import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { upsertDeadlineReminderPreferences, upsertNotificationPreferences } from "../mutations";

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

describe("upsertDeadlineReminderPreferences", () => {
  it("upserts a single field and returns preferences", async () => {
    vi.mocked(prisma.userSettings.upsert).mockResolvedValue({
      consultation_reminder_days: 7,
      consultation_reminder_frequency: "KeyDays",
      consultation_notify_overdue: true,
      milestone_reminder_days: 5,
      milestone_reminder_frequency: "KeyDays",
      milestone_notify_overdue: true,
    } as unknown as never);

    const result = await upsertDeadlineReminderPreferences("u1", { consultation_reminder_days: 7 });

    expect(result).toEqual({
      consultation_reminder_days: 7,
      consultation_reminder_frequency: "KeyDays",
      consultation_notify_overdue: true,
      milestone_reminder_days: 5,
      milestone_reminder_frequency: "KeyDays",
      milestone_notify_overdue: true,
    });
    expect(prisma.userSettings.upsert).toHaveBeenCalledWith({
      where: { user_id: "u1" },
      update: { consultation_reminder_days: 7 },
      create: { user_id: "u1", consultation_reminder_days: 7 },
      select: {
        consultation_reminder_days: true,
        consultation_reminder_frequency: true,
        consultation_notify_overdue: true,
        milestone_reminder_days: true,
        milestone_reminder_frequency: true,
        milestone_notify_overdue: true,
      },
    });
  });

  it("upserts multiple fields", async () => {
    vi.mocked(prisma.userSettings.upsert).mockResolvedValue({
      consultation_reminder_days: 1,
      consultation_reminder_frequency: "Daily",
      consultation_notify_overdue: false,
      milestone_reminder_days: 14,
      milestone_reminder_frequency: "Daily",
      milestone_notify_overdue: false,
    } as unknown as never);

    const result = await upsertDeadlineReminderPreferences("u1", {
      consultation_reminder_days: 1,
      milestone_reminder_days: 14,
    });

    expect(result.milestone_reminder_days).toBe(14);
    expect(result.consultation_reminder_days).toBe(1);
  });

  it("propagates database errors", async () => {
    vi.mocked(prisma.userSettings.upsert).mockRejectedValue(new Error("db failed"));

    await expect(
      upsertDeadlineReminderPreferences("u1", { consultation_reminder_days: 3 }),
    ).rejects.toThrow("db failed");
  });
});
