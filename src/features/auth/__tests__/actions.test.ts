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
  it("signs in with the Google provider and redirects to the dashboard", async () => {
    await loginWithGoogle();

    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/dashboard" });
  });
});

describe("logoutUser", () => {
  it("redirects to the sign-in page when called without a reason", async () => {
    await logoutUser();

    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/" });
  });

  it("redirects to the sign-in page when invoked", async () => {
    await logoutUser();

    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/" });
  });

  it("calls signOut exactly once per invocation", async () => {
    await logoutUser();

    expect(signOut).toHaveBeenCalledTimes(1);
  });
});