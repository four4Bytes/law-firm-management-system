import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import {
  getDeadlineReminderPreferences,
  getDeadlineReminderPreferencesByUserIds,
  getNotificationPreferences,
  getNotificationPreferencesByUserIds,
} from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: { userSettings: { findUnique: vi.fn(), findMany: vi.fn() } },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

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

describe("getDeadlineReminderPreferences", () => {
  it("returns defaults when no settings row exists", async () => {
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValue(null);

    const result = await getDeadlineReminderPreferences("user-1");

    expect(result).toEqual({
      consultation_reminder_days: 3,
      consultation_reminder_frequency: "KeyDays",
      consultation_notify_overdue: true,
      milestone_reminder_days: 5,
      milestone_reminder_frequency: "KeyDays",
      milestone_notify_overdue: true,
    });
    expect(prisma.userSettings.findUnique).toHaveBeenCalledWith({
      where: { user_id: "user-1" },
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

  it("returns stored preferences when row exists", async () => {
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({
      consultation_reminder_days: 7,
      consultation_reminder_frequency: "Daily",
      consultation_notify_overdue: false,
      milestone_reminder_days: 14,
      milestone_reminder_frequency: "KeyDays",
      milestone_notify_overdue: true,
    } as unknown as never);

    const result = await getDeadlineReminderPreferences("user-1");

    expect(result).toEqual({
      consultation_reminder_days: 7,
      consultation_reminder_frequency: "Daily",
      consultation_notify_overdue: false,
      milestone_reminder_days: 14,
      milestone_reminder_frequency: "KeyDays",
      milestone_notify_overdue: true,
    });
  });

  it("propagates database errors", async () => {
    vi.mocked(prisma.userSettings.findUnique).mockRejectedValue(new Error("db failed"));

    await expect(getDeadlineReminderPreferences("user-1")).rejects.toThrow("db failed");
  });
});

describe("getDeadlineReminderPreferencesByUserIds", () => {
  it("returns empty map without querying when no ids", async () => {
    const result = await getDeadlineReminderPreferencesByUserIds([]);

    expect(result.size).toBe(0);
    expect(prisma.userSettings.findMany).not.toHaveBeenCalled();
  });

  it("returns defaults for users without rows and stored prefs for others", async () => {
    vi.mocked(prisma.userSettings.findMany).mockResolvedValue([
      {
        user_id: "u1",
        consultation_reminder_days: 1,
        consultation_reminder_frequency: "Daily",
        consultation_notify_overdue: false,
        milestone_reminder_days: 2,
        milestone_reminder_frequency: "Daily",
        milestone_notify_overdue: false,
      } as unknown as never,
    ]);

    const result = await getDeadlineReminderPreferencesByUserIds(["u1", "u2"]);

    expect(result.get("u1")).toEqual({
      consultation_reminder_days: 1,
      consultation_reminder_frequency: "Daily",
      consultation_notify_overdue: false,
      milestone_reminder_days: 2,
      milestone_reminder_frequency: "Daily",
      milestone_notify_overdue: false,
    });
    expect(result.get("u2")).toEqual({
      consultation_reminder_days: 3,
      consultation_reminder_frequency: "KeyDays",
      consultation_notify_overdue: true,
      milestone_reminder_days: 5,
      milestone_reminder_frequency: "KeyDays",
      milestone_notify_overdue: true,
    });
  });

  it("returns stored prefs for all users when all have rows", async () => {
    vi.mocked(prisma.userSettings.findMany).mockResolvedValue([
      {
        user_id: "u1",
        consultation_reminder_days: 0,
        consultation_reminder_frequency: "KeyDays",
        consultation_notify_overdue: true,
        milestone_reminder_days: 0,
        milestone_reminder_frequency: "KeyDays",
        milestone_notify_overdue: true,
      } as unknown as never,
      {
        user_id: "u2",
        consultation_reminder_days: 30,
        consultation_reminder_frequency: "Daily",
        consultation_notify_overdue: false,
        milestone_reminder_days: 30,
        milestone_reminder_frequency: "Daily",
        milestone_notify_overdue: false,
      } as unknown as never,
    ]);

    const result = await getDeadlineReminderPreferencesByUserIds(["u1", "u2"]);

    expect(result.get("u1")?.consultation_reminder_days).toBe(0);
    expect(result.get("u2")?.consultation_reminder_days).toBe(30);
  });

  it("propagates database errors", async () => {
    vi.mocked(prisma.userSettings.findMany).mockRejectedValue(new Error("db failed"));

    await expect(getDeadlineReminderPreferencesByUserIds(["u1"])).rejects.toThrow("db failed");
  });
});
