import { describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/browser";
import { requirePermission } from "@/lib/auth-guards";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

const { auth: authMock } = vi.hoisted(() => ({ auth: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

const adminSession = {
  user: { id: "u1", email: "admin@firm.test", role: Role.Admin, name: "Admin" },
};
const lawyerSession = {
  user: { id: "u2", email: "lawyer@firm.test", role: Role.Lawyer, name: "Lawyer" },
};

describe("requirePermission", () => {
  it("returns the authenticated user when authorized", async () => {
    authMock.mockResolvedValue(adminSession);

    await expect(requirePermission("activity.read")).resolves.toEqual(adminSession.user);
  });

  it("throws UnauthorizedError on an unauthorized session", async () => {
    authMock.mockRejectedValue(new UnauthorizedError());

    await expect(requirePermission("activity.read")).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("throws ForbiddenError when no permission is granted", async () => {
    authMock.mockResolvedValue(lawyerSession);

    await expect(requirePermission("activity.read")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rethrows framework control-flow errors without logging", async () => {
    const digestError = Object.assign(
      new Error("Route /audit couldn't be rendered statically because it used `headers`"),
      { digest: "DYNAMIC_SERVER_USAGE" },
    );
    authMock.mockRejectedValue(digestError);

    await expect(requirePermission("activity.read")).rejects.toBe(digestError);
  });
});
