import { beforeEach, describe, expect, it, vi } from "vitest";

import { getNotificationPreferencesByUserIds } from "@/features/settings/queries";
import { getActiveUserIds, getUsersByIds } from "@/features/users/queries";
import { NotificationType } from "@/generated/prisma/browser";
import { sendEmail } from "@/lib/email";
import { consultationAssignedTemplate, statusChangeTemplate } from "@/lib/email-templates";

import { dispatchNotifications } from "../dispatch";
import { createNotifications } from "../mutations";

vi.mock("../mutations", () => ({
  createNotifications: vi.fn().mockResolvedValue({ count: 1 }),
}));

vi.mock("@/features/users/queries", () => ({
  getActiveUserIds: vi.fn(),
  getUserNameById: vi.fn().mockResolvedValue("System"),
  getUsersByIds: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/features/settings/queries", () => ({
  getNotificationPreferencesByUserIds: vi.fn(),
  getNotificationPreferences: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/email-templates", () => ({
  consultationAssignedTemplate: vi.fn(() => "<html/>"),
  consultationOverdueTemplate: vi.fn(() => "<html/>"),
  consultationReminderTemplate: vi.fn(() => "<html/>"),
  milestoneTemplate: vi.fn(() => "<html/>"),
  statusChangeTemplate: vi.fn(() => "<html/>"),
  taskAssignedTemplate: vi.fn(() => "<html/>"),
  caseAssignedTemplate: vi.fn(() => "<html/>"),
}));

const payload = {
  userIds: ["u1", "u2", "u3"],
  type: NotificationType.TaskAssigned,
  title: "New task",
  message: "You have been assigned",
  actionUrl: "/case/c1",
  caseId: "c1",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getActiveUserIds).mockImplementation(async ({ ids }) => [...ids]);
  vi.mocked(getUsersByIds).mockResolvedValue([
    { id: "u1", name: "Alice", email: "alice@aninolaw.com" },
    { id: "u2", name: "Bob", email: "bob@aninolaw.com" },
    { id: "u3", name: "Carol", email: "carol@aninolaw.com" },
  ]);
  vi.mocked(getNotificationPreferencesByUserIds).mockResolvedValue(
    new Map([
      [
        "u1",
        {
          notify_email_case_assigned: true,
          notify_email_consultation_assigned: true,
          notify_email_task_assigned: true,
        },
      ],
      [
        "u2",
        {
          notify_email_case_assigned: true,
          notify_email_consultation_assigned: true,
          notify_email_task_assigned: true,
        },
      ],
      [
        "u3",
        {
          notify_email_case_assigned: true,
          notify_email_consultation_assigned: true,
          notify_email_task_assigned: true,
        },
      ],
    ]),
  );
});

describe("dispatchNotifications", () => {
  it("excludes the actor by default and deduplicates recipients", async () => {
    const result = await dispatchNotifications(
      { ...payload, userIds: ["u1", "u2", "u2", "u3"] },
      "u1",
    );

    expect(result).toEqual({ count: 1 });
    expect(createNotifications).toHaveBeenCalledWith({
      ...payload,
      userIds: ["u2", "u3"],
    });
  });

  it("keeps the actor when notifyActor is true", async () => {
    await dispatchNotifications({ ...payload, userIds: ["u1"] }, "u1", true);

    expect(createNotifications).toHaveBeenCalledWith({
      ...payload,
      userIds: ["u1"],
    });
  });

  it("drops inactive users before creating notifications", async () => {
    vi.mocked(getActiveUserIds).mockResolvedValue(["u1", "u3"]);

    await dispatchNotifications(payload, "u9");

    expect(createNotifications).toHaveBeenCalledWith({
      ...payload,
      userIds: ["u1", "u3"],
    });
  });

  it("returns zero without creating notifications when no recipients remain", async () => {
    vi.mocked(getActiveUserIds).mockResolvedValue([]);

    const result = await dispatchNotifications(payload, "u9");

    expect(result).toEqual({ count: 0 });
    expect(createNotifications).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("returns zero without creating notifications when only the actor remains", async () => {
    const result = await dispatchNotifications({ ...payload, userIds: ["u1"] }, "u1");

    expect(result).toEqual({ count: 0 });
    expect(createNotifications).not.toHaveBeenCalled();
  });

  it("sends one email per recipient with a resolved template", async () => {
    await dispatchNotifications(payload, "u9");

    expect(sendEmail).toHaveBeenCalledTimes(3);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "alice@aninolaw.com", subject: "New task" }),
    );
  });

  it("skips email for recipients without an email address", async () => {
    vi.mocked(getUsersByIds).mockResolvedValue([{ id: "u1", name: "Alice", email: null }]);

    await dispatchNotifications({ ...payload, userIds: ["u1"] }, "u9");

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("resolves the assigned template for consultation-assigned dispatches", async () => {
    await dispatchNotifications({ ...payload, type: NotificationType.ConsultationAssigned }, "u9");

    expect(vi.mocked(consultationAssignedTemplate)).toHaveBeenCalledTimes(3);
    expect(sendEmail).toHaveBeenCalledTimes(3);
  });

  it.each([
    NotificationType.MilestoneStatusChanged,
    NotificationType.TaskStatusChanged,
    NotificationType.CaseStatusChanged,
    NotificationType.ConsultationStatusChanged,
  ])("resolves statusChangeTemplate for %s dispatches", async (type) => {
    await dispatchNotifications({ ...payload, type }, "u9");

    expect(vi.mocked(statusChangeTemplate)).toHaveBeenCalledTimes(3);
    expect(sendEmail).toHaveBeenCalledTimes(3);
  });

  it("respects email preference for CaseAssigned — only opted-in users receive email but all get in-app row", async () => {
    vi.mocked(getNotificationPreferencesByUserIds).mockResolvedValue(
      new Map([
        [
          "u1",
          {
            notify_email_case_assigned: false,
            notify_email_consultation_assigned: true,
            notify_email_task_assigned: true,
          },
        ],
        [
          "u2",
          {
            notify_email_case_assigned: true,
            notify_email_consultation_assigned: true,
            notify_email_task_assigned: true,
          },
        ],
        [
          "u3",
          {
            notify_email_case_assigned: false,
            notify_email_consultation_assigned: true,
            notify_email_task_assigned: true,
          },
        ],
      ]),
    );

    await dispatchNotifications({ ...payload, type: NotificationType.CaseAssigned }, "u9");

    expect(createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: ["u1", "u2", "u3"] }),
    );
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "bob@aninolaw.com" }));
  });

  it("respects email preference for ConsultationAssigned", async () => {
    vi.mocked(getNotificationPreferencesByUserIds).mockResolvedValue(
      new Map([
        [
          "u1",
          {
            notify_email_case_assigned: true,
            notify_email_consultation_assigned: false,
            notify_email_task_assigned: true,
          },
        ],
        [
          "u2",
          {
            notify_email_case_assigned: true,
            notify_email_consultation_assigned: true,
            notify_email_task_assigned: true,
          },
        ],
      ]),
    );
    vi.mocked(getActiveUserIds).mockResolvedValue(["u1", "u2"]);

    await dispatchNotifications({ ...payload, type: NotificationType.ConsultationAssigned }, "u9");

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "bob@aninolaw.com" }));
  });

  it("respects email preference for TaskAssigned — filters per-task toggle", async () => {
    vi.mocked(getNotificationPreferencesByUserIds).mockResolvedValue(
      new Map([
        [
          "u1",
          {
            notify_email_case_assigned: true,
            notify_email_consultation_assigned: true,
            notify_email_task_assigned: false,
          },
        ],
        [
          "u2",
          {
            notify_email_case_assigned: true,
            notify_email_consultation_assigned: true,
            notify_email_task_assigned: true,
          },
        ],
      ]),
    );
    vi.mocked(getActiveUserIds).mockResolvedValue(["u1", "u2"]);
    vi.mocked(getUsersByIds).mockResolvedValue([
      { id: "u1", name: "Alice", email: "alice@aninolaw.com" },
      { id: "u2", name: "Bob", email: "bob@aninolaw.com" },
    ]);

    await dispatchNotifications({ ...payload, type: NotificationType.TaskAssigned }, "u9");

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "bob@aninolaw.com" }));
  });

  it("does not filter email for non-assignment types even when assignment prefs are off", async () => {
    vi.mocked(getNotificationPreferencesByUserIds).mockResolvedValue(
      new Map([
        [
          "u1",
          {
            notify_email_case_assigned: false,
            notify_email_consultation_assigned: false,
            notify_email_task_assigned: false,
          },
        ],
      ]),
    );
    vi.mocked(getActiveUserIds).mockResolvedValue(["u1"]);
    vi.mocked(getUsersByIds).mockResolvedValue([
      { id: "u1", name: "Alice", email: "alice@aninolaw.com" },
    ]);

    await dispatchNotifications({ ...payload, type: NotificationType.CaseStatusChanged }, "u9");

    expect(getNotificationPreferencesByUserIds).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("falls back to sending all emails when preference lookup fails", async () => {
    vi.mocked(getNotificationPreferencesByUserIds).mockRejectedValue(new Error("db down"));

    await dispatchNotifications({ ...payload, type: NotificationType.CaseAssigned }, "u9");

    expect(createNotifications).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledTimes(3);
  });
});
