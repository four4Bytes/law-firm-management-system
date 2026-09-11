import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/browser";
import { requireAuth } from "@/lib/auth-guards";
import { UnauthorizedError } from "@/lib/errors";

import { getNotificationPreferencesAction, updateNotificationPreferencesAction } from "../actions";
import { upsertNotificationPreferences } from "../mutations";
import { getNotificationPreferences } from "../queries";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("../queries", () => ({
  getNotificationPreferences: vi.fn(),
}));

vi.mock("../mutations", () => ({
  upsertNotificationPreferences: vi.fn(),
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
    });

    const result = await getNotificationPreferencesAction();

    expect(result).toEqual({
      notify_email_case_assigned: true,
      notify_email_consultation_assigned: false,
      notify_email_task_assigned: true,
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
