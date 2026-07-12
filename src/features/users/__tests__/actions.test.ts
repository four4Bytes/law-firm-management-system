import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuth } from "@/lib/auth-guards";
import { isDeveloperEmail } from "@/lib/developer-emails";

import { checkDeveloperEmail } from "../actions";

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u1", email: "e", role: "admin", name: "n" }),
  requireRole: vi.fn().mockResolvedValue({ id: "u1", email: "e", role: "admin", name: "n" }),
}));

vi.mock("@/lib/developer-emails", () => ({
  isDeveloperEmail: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkDeveloperEmail", () => {
  it("requires authentication before checking the email", async () => {
    vi.mocked(isDeveloperEmail).mockReturnValue(true);

    await checkDeveloperEmail("dev@example.com");

    expect(requireAuth).toHaveBeenCalled();
  });

  it("returns true for a developer email", async () => {
    vi.mocked(isDeveloperEmail).mockReturnValue(true);

    expect(await checkDeveloperEmail("dev@example.com")).toBe(true);
    expect(isDeveloperEmail).toHaveBeenCalledWith("dev@example.com");
  });

  it("returns false for a non-developer email", async () => {
    vi.mocked(isDeveloperEmail).mockReturnValue(false);

    expect(await checkDeveloperEmail("someone@example.com")).toBe(false);
  });

  it("propagates the error when the caller is not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValueOnce(new Error("Unauthorized"));

    await expect(checkDeveloperEmail("dev@example.com")).rejects.toThrow("Unauthorized");
    expect(isDeveloperEmail).not.toHaveBeenCalled();
  });
});