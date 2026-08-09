import { beforeEach, describe, expect, it, vi } from "vitest";

import { getActiveUserIds, getUsersByIds } from "@/features/users/queries";
import { NotificationType } from "@/generated/prisma/browser";
import { sendEmail } from "@/lib/email";

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

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/email-templates", () => ({
  consultationCreatedTemplate: vi.fn(() => "<html/>"),
  consultationUpdatedTemplate: vi.fn(() => "<html/>"),
  consultationReminderTemplate: vi.fn(() => "<html/>"),
  milestoneTemplate: vi.fn(() => "<html/>"),
  taskAssignedTemplate: vi.fn(() => "<html/>"),
  taskUpdatedTemplate: vi.fn(() => "<html/>"),
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
});
