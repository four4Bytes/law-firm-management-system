import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/browser";
import { requireAuth } from "@/lib/auth-guards";
import { UnauthorizedError } from "@/lib/errors";

import {
  getDeadlineReminderPreferencesAction,
  getNotificationPreferencesAction,
  updateDeadlineReminderPreferencesAction,
  updateNotificationPreferencesAction,
} from "../actions";
import { upsertDeadlineReminderPreferences, upsertNotificationPreferences } from "../mutations";
import { getDeadlineReminderPreferences, getNotificationPreferences } from "../queries";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("../queries", () => ({
  getNotificationPreferences: vi.fn(),
  getDeadlineReminderPreferences: vi.fn(),
}));

vi.mock("../mutations", () => ({
  upsertNotificationPreferences: vi.fn(),
  upsertDeadlineReminderPreferences: vi.fn(),
}));

const session = { id: "user-1", email: "a@b.com", role: Role.Lawyer, name: "Alice" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAuth).mockResolvedValue(session);
});

describe("getNotificationPreferencesAction", () => {
  it("returns preferences for the authenticated user", async () => {
    vi.mocked(getNotificationPreferences).mockResolvedValue({
      notify_email_case_assigned: true,
      notify_email_consultation_assigned: false,
      notify_email_task_assigned: true,
      notify_email_case_status_changed: true,
      notify_email_consultation_status_changed: false,
      notify_email_task_status_changed: true,
      notify_email_milestone_status_changed: false,
    });

    const result = await getNotificationPreferencesAction();

    expect(result).toEqual({
      notify_email_case_assigned: true,
      notify_email_consultation_assigned: false,
      notify_email_task_assigned: true,
      notify_email_case_status_changed: true,
      notify_email_consultation_status_changed: false,
      notify_email_task_status_changed: true,
      notify_email_milestone_status_changed: false,
    });
    expect(getNotificationPreferences).toHaveBeenCalledWith("user-1");
  });

  it("throws when unauthenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new UnauthorizedError());

    await expect(getNotificationPreferencesAction()).rejects.toThrow(UnauthorizedError);
  });
});

describe("updateNotificationPreferencesAction", () => {
  it("returns validation error for empty payload", async () => {
    const result = await updateNotificationPreferencesAction({});

    expect(result).toEqual({
      success: false,
      error: {
        code: "validation",
        title: "Invalid settings data",
        description: "Some fields are missing or malformed. Review your input and try again.",
      },
    });
    expect(upsertNotificationPreferences).not.toHaveBeenCalled();
  });

  it("returns validation error for non-boolean value", async () => {
    const result = await updateNotificationPreferencesAction({
      notify_email_case_assigned: "true",
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("validation");
  });

  it("updates a single preference and revalidates", async () => {
    vi.mocked(upsertNotificationPreferences).mockResolvedValue({
      notify_email_case_assigned: false,
      notify_email_consultation_assigned: true,
      notify_email_task_assigned: true,
      notify_email_case_status_changed: true,
      notify_email_consultation_status_changed: true,
      notify_email_task_status_changed: true,
      notify_email_milestone_status_changed: true,
    });

    const result = await updateNotificationPreferencesAction({ notify_email_case_assigned: false });

    expect(result).toEqual({ success: true });
    expect(upsertNotificationPreferences).toHaveBeenCalledWith("user-1", {
      notify_email_case_assigned: false,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("updates multiple preferences", async () => {
    vi.mocked(upsertNotificationPreferences).mockResolvedValue({
      notify_email_case_assigned: false,
      notify_email_consultation_assigned: false,
      notify_email_task_assigned: false,
      notify_email_case_status_changed: false,
      notify_email_consultation_status_changed: false,
      notify_email_task_status_changed: false,
      notify_email_milestone_status_changed: false,
    });

    const result = await updateNotificationPreferencesAction({
      notify_email_case_assigned: false,
      notify_email_consultation_assigned: false,
    });

    expect(result.success).toBe(true);
    expect(upsertNotificationPreferences).toHaveBeenCalledWith("user-1", {
      notify_email_case_assigned: false,
      notify_email_consultation_assigned: false,
    });
  });

  it("updates a status-change preference", async () => {
    vi.mocked(upsertNotificationPreferences).mockResolvedValue({
      notify_email_case_assigned: true,
      notify_email_consultation_assigned: true,
      notify_email_task_assigned: true,
      notify_email_case_status_changed: false,
      notify_email_consultation_status_changed: true,
      notify_email_task_status_changed: true,
      notify_email_milestone_status_changed: true,
    });

    const result = await updateNotificationPreferencesAction({
      notify_email_case_status_changed: false,
    });

    expect(result).toEqual({ success: true });
    expect(upsertNotificationPreferences).toHaveBeenCalledWith("user-1", {
      notify_email_case_status_changed: false,
    });
  });

  it("returns unauthorized when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new UnauthorizedError());

    const result = await updateNotificationPreferencesAction({ notify_email_case_assigned: true });

    expect(result).toEqual({
      success: false,
      error: {
        code: "unauthorized",
        title: "Session expired",
        description: "Please sign in again to continue.",
      },
    });
  });

  it("returns unknown error when mutation fails", async () => {
    vi.mocked(upsertNotificationPreferences).mockRejectedValue(new Error("db error"));

    const result = await updateNotificationPreferencesAction({ notify_email_case_assigned: true });

    expect(result).toEqual({
      success: false,
      error: {
        code: "unknown",
        title: "Failed to update notification preferences",
        description: "Something went wrong on our end. Please try again.",
      },
    });
  });
});

describe("getDeadlineReminderPreferencesAction", () => {
  it("returns preferences for the authenticated user", async () => {
    vi.mocked(getDeadlineReminderPreferences).mockResolvedValue({
      consultation_reminder_days: 3,
      consultation_reminder_frequency: "KeyDays",
      consultation_notify_overdue: true,
      milestone_reminder_days: 5,
      milestone_reminder_frequency: "KeyDays",
      milestone_notify_overdue: true,
    });

    const result = await getDeadlineReminderPreferencesAction();

    expect(result).toEqual({
      consultation_reminder_days: 3,
      consultation_reminder_frequency: "KeyDays",
      consultation_notify_overdue: true,
      milestone_reminder_days: 5,
      milestone_reminder_frequency: "KeyDays",
      milestone_notify_overdue: true,
    });
    expect(getDeadlineReminderPreferences).toHaveBeenCalledWith("user-1");
  });

  it("throws when unauthenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new UnauthorizedError());

    await expect(getDeadlineReminderPreferencesAction()).rejects.toThrow(UnauthorizedError);
  });
});

describe("updateDeadlineReminderPreferencesAction", () => {
  it("returns validation error for empty payload", async () => {
    const result = await updateDeadlineReminderPreferencesAction({});

    expect(result).toEqual({
      success: false,
      error: {
        code: "validation",
        title: "Invalid settings data",
        description: "Some fields are missing or malformed. Review your input and try again.",
      },
    });
    expect(upsertDeadlineReminderPreferences).not.toHaveBeenCalled();
  });

  it("returns validation error for out-of-range days", async () => {
    const result = await updateDeadlineReminderPreferencesAction({
      consultation_reminder_days: 99,
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("validation");
  });

  it("returns validation error for invalid enum", async () => {
    const result = await updateDeadlineReminderPreferencesAction({
      consultation_reminder_frequency: "Weekly",
    } as unknown as never);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("validation");
  });

  it("updates a single preference and revalidates", async () => {
    vi.mocked(upsertDeadlineReminderPreferences).mockResolvedValue({
      consultation_reminder_days: 7,
      consultation_reminder_frequency: "KeyDays",
      consultation_notify_overdue: true,
      milestone_reminder_days: 5,
      milestone_reminder_frequency: "KeyDays",
      milestone_notify_overdue: true,
    });

    const result = await updateDeadlineReminderPreferencesAction({ consultation_reminder_days: 7 });

    expect(result).toEqual({ success: true });
    expect(upsertDeadlineReminderPreferences).toHaveBeenCalledWith("user-1", {
      consultation_reminder_days: 7,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("updates multiple preferences", async () => {
    vi.mocked(upsertDeadlineReminderPreferences).mockResolvedValue({
      consultation_reminder_days: 7,
      consultation_reminder_frequency: "Daily",
      consultation_notify_overdue: false,
      milestone_reminder_days: 14,
      milestone_reminder_frequency: "Daily",
      milestone_notify_overdue: false,
    });

    const result = await updateDeadlineReminderPreferencesAction({
      consultation_reminder_days: 7,
      consultation_notify_overdue: false,
    });

    expect(result.success).toBe(true);
    expect(upsertDeadlineReminderPreferences).toHaveBeenCalledWith("user-1", {
      consultation_reminder_days: 7,
      consultation_notify_overdue: false,
    });
  });

  it("returns unauthorized when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new UnauthorizedError());

    const result = await updateDeadlineReminderPreferencesAction({ consultation_reminder_days: 7 });

    expect(result).toEqual({
      success: false,
      error: {
        code: "unauthorized",
        title: "Session expired",
        description: "Please sign in again to continue.",
      },
    });
  });

  it("returns unknown error when mutation fails", async () => {
    vi.mocked(upsertDeadlineReminderPreferences).mockRejectedValue(new Error("db error"));

    const result = await updateDeadlineReminderPreferencesAction({ consultation_reminder_days: 7 });

    expect(result).toEqual({
      success: false,
      error: {
        code: "unknown",
        title: "Failed to update deadline reminder preferences",
        description: "Something went wrong on our end. Please try again.",
      },
    });
  });
});
