import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/browser";
import { requirePermissionOrNull } from "@/lib/auth-guards";
import { UnauthorizedError } from "@/lib/errors";

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

describe("requirePermissionOrNull", () => {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the authenticated user when authorized", async () => {
    authMock.mockResolvedValue(adminSession);

    await expect(requirePermissionOrNull("activity.read")).resolves.toEqual(adminSession.user);
  });

  it("returns null on an unauthorized session", async () => {
    authMock.mockRejectedValue(new UnauthorizedError());

    await expect(requirePermissionOrNull("activity.read")).resolves.toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("returns null when no permission is granted", async () => {
    authMock.mockResolvedValue(lawyerSession);

    await expect(requirePermissionOrNull("activity.read")).resolves.toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("rethrows framework control-flow errors without logging", async () => {
    const digestError = Object.assign(
      new Error("Route /audit couldn't be rendered statically because it used `headers`"),
      { digest: "DYNAMIC_SERVER_USAGE" },
    );
    authMock.mockRejectedValue(digestError);

    await expect(requirePermissionOrNull("activity.read")).rejects.toBe(digestError);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("rethrows unexpected errors without logging", async () => {
    const unexpected = new Error("boom");
    authMock.mockRejectedValue(unexpected);

    await expect(requirePermissionOrNull("activity.read")).rejects.toBe(unexpected);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
