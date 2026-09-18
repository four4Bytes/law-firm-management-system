import { afterEach, describe, expect, it, vi } from "vitest";

import { dispatchNotifications } from "@/features/notifications/dispatch";
import { notifyRecipients } from "@/features/notifications/notify";
import { NotificationType } from "@/generated/prisma/browser";
import { logError } from "@/lib/logger";

vi.mock("@/features/notifications/dispatch", () => ({
  dispatchNotifications: vi.fn().mockResolvedValue({ count: 0 }),
}));

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
}));

const basePayload = {
  userIds: ["u1"],
  type: NotificationType.TaskAssigned,
  title: "Task assigned: T",
  message: "You have been assigned to task: T",
  actionUrl: "/case/c1",
  caseId: "c1",
  taskId: "t1",
};

describe("notifyRecipients", () => {
  afterEach(() => {
    vi.mocked(dispatchNotifications).mockClear();
    vi.restoreAllMocks();
  });

  it("does not call dispatchNotifications when there are no recipients", async () => {
    await notifyRecipients("actor", { ...basePayload, userIds: [] });
    expect(dispatchNotifications).not.toHaveBeenCalled();
  });

  it("dispatches with the actor userId and payload", async () => {
    await notifyRecipients("actor", basePayload);
    expect(dispatchNotifications).toHaveBeenCalledTimes(1);
    expect(dispatchNotifications).toHaveBeenCalledWith(basePayload, "actor");
  });

  it("swallows dispatch failures and does not throw", async () => {
    vi.mocked(dispatchNotifications).mockRejectedValueOnce(new Error("boom"));

    await expect(notifyRecipients("actor", basePayload)).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalled();
  });

  it("includes the label in the logged message", async () => {
    vi.mocked(dispatchNotifications).mockRejectedValueOnce(new Error("boom"));

    await notifyRecipients("actor", basePayload, "status change");

    expect(logError).toHaveBeenCalledWith(
      "notifications.dispatch.status change",
      expect.any(Error),
    );
  });
});
