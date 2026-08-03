import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationType } from "@/generated/prisma/browser";
import { sendEmail } from "@/lib/email";

import { dispatchNotifications } from "../dispatch";
import { createNotifications } from "../mutations";

vi.mock("../mutations", () => ({
  createNotifications: vi.fn().mockResolvedValue({ count: 1 }),
}));

vi.mock("@/features/users/queries", () => ({
  getUserNameById: vi.fn().mockResolvedValue("Actor User"),
  getUsersByIds: vi
    .fn()
    .mockResolvedValue([{ id: "u2", email: "u2@example.com", name: "Recipient Two" }]),
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe("dispatchNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deduplicates recipients before creating notifications", async () => {
    await dispatchNotifications(
      {
        userIds: ["u1", "u2", "u2"],
        type: NotificationType.ConsultationCreated,
        title: "New consultation",
        message: "A new consultation was created",
      },
      "u1",
    );

    expect(createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: ["u2"],
      }),
    );
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
