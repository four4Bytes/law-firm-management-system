import { afterEach, describe, expect, it, vi } from "vitest";

import { dispatchNotifications } from "@/features/notifications/dispatch";
import { notifyRecipients } from "@/features/notifications/notify";
import { NotificationType } from "@/generated/prisma/browser";

vi.mock("@/features/notifications/dispatch", () => ({
  dispatchNotifications: vi.fn().mockResolvedValue({ count: 0 }),
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
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(dispatchNotifications).mockRejectedValueOnce(new Error("boom"));

    await expect(notifyRecipients("actor", basePayload)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("includes the label in the logged message", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(dispatchNotifications).mockRejectedValueOnce(new Error("boom"));

    await notifyRecipients("actor", basePayload, "status change");

    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to dispatch status change notification:",
      expect.any(Error),
    );
  });
});
