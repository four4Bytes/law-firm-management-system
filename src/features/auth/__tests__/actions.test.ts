import { beforeEach, describe, expect, it, vi } from "vitest";

import { signIn, signOut } from "@/lib/auth";

import { loginWithGoogle, logoutUser } from "../actions";

vi.mock("@/lib/auth", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loginWithGoogle", () => {
  it("signs in with Google and redirects to the dashboard", async () => {
    await loginWithGoogle();

    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/dashboard" });
  });
});

describe("logoutUser", () => {
  it("signs out and redirects to the sign-in page when no reason is given", async () => {
    await logoutUser();

    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/" });
  });

  it("signs out and redirects to the deactivated page when reason is 'deactivated'", async () => {
    await logoutUser("deactivated");

    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/deactivated?reason=deactivated" });
  });
});