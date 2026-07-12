import { beforeEach, describe, expect, it, vi } from "vitest";

import { createUser, setUserActiveStatus, updateUser } from "@/features/users/mutations";
import { countActiveAdminsAndDevs, getUserByEmail, getUserById } from "@/features/users/queries";
import { Role } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth-guards";
import { isDeveloperEmail } from "@/lib/developer-emails";

import { createUserAction, deactivateUserAction, updateUserAction } from "../actions";

vi.mock("@/lib/auth-guards", () => ({
  requireRole: vi.fn(),
}));

vi.mock("@/lib/developer-emails", () => ({
  isDeveloperEmail: vi.fn().mockReturnValue(false),
}));

vi.mock("@/features/users/queries", () => ({
  getUserById: vi.fn(),
  getUserByEmail: vi.fn(),
  countActiveAdminsAndDevs: vi.fn(),
}));

vi.mock("@/features/users/mutations", () => ({
  createUser: vi.fn(),
  updateUser: vi.fn(),
  setUserActiveStatus: vi.fn(),
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

const sessionAdmin = { id: "admin-id", email: "admin@law.com", role: "Admin", name: "Admin" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isDeveloperEmail).mockReturnValue(false);
});

describe("createUserAction", () => {
  const validPayload = { email: "lawyer@law.com", role: "Lawyer" as const };

  it("returns an error when unauthorized", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("Forbidden"));

    expect(await createUserAction(validPayload)).toEqual({
      success: false,
      error: "You don't have permission to create users.",
    });
  });

  it("returns an error for a payload missing email", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await createUserAction({ role: "Lawyer" } as any)).toEqual({
      success: false,
      error: "Invalid email or role",
    });
  });

  it("returns an error for an invalid role string", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await createUserAction({ email: "lawyer@law.com", role: "SuperAdmin" } as any)).toEqual({
      success: false,
      error: "Invalid email or role",
    });
  });

  it("creates a user successfully", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);
    vi.mocked(getUserByEmail).mockResolvedValue(null);
    vi.mocked(createUser).mockResolvedValue({ id: "new-user-id" });

    const result = await createUserAction(validPayload);

    expect(result).toEqual({ success: true });
    expect(createUser).toHaveBeenCalledWith("lawyer@law.com", "Lawyer");
  });

  it("creates a Dev user from a developer email", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);
    vi.mocked(isDeveloperEmail).mockReturnValue(true);
    vi.mocked(getUserByEmail).mockResolvedValue(null);
    vi.mocked(createUser).mockResolvedValue({ id: "new-user-id" });

    const result = await createUserAction({ email: "dev@example.com", role: "Lawyer" });

    expect(result).toEqual({ success: true });
    expect(createUser).toHaveBeenCalledWith("dev@example.com", Role.Dev);
  });

  it("returns an error when the email belongs to an active user", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "existing-id",
      role: "Lawyer",
      is_active: true,
    });

    const result = await createUserAction(validPayload);

    expect(result).toEqual({
      success: false,
      error: "A user with this email already exists.",
    });
    expect(createUser).not.toHaveBeenCalled();
  });

  it("reactivates an inactive existing user", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "inactive-id",
      role: "Lawyer",
      is_active: false,
    });
    vi.mocked(updateUser).mockResolvedValue(undefined);

    const result = await createUserAction(validPayload);

    expect(result).toEqual({ success: true });
    expect(updateUser).toHaveBeenCalledWith("inactive-id", { role: "Lawyer", is_active: true });
    expect(createUser).not.toHaveBeenCalled();
  });

  it("returns an error when reactivation fails", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "inactive-id",
      role: "Lawyer",
      is_active: false,
    });
    vi.mocked(updateUser).mockRejectedValue(new Error("db error"));

    const result = await createUserAction(validPayload);

    expect(result).toEqual({
      success: false,
      error: "Failed to reactivate user.",
    });
  });

  it("returns an error when creation fails", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);
    vi.mocked(getUserByEmail).mockResolvedValue(null);
    vi.mocked(createUser).mockRejectedValue(new Error("db error"));

    const result = await createUserAction(validPayload);

    expect(result).toEqual({
      success: false,
      error: "Failed to create user.",
    });
  });
});

describe("updateUserAction", () => {
  const validPayload = { userId: uuid, email: "updated@law.com", role: "Paralegal" as const };

  it("returns an error when unauthorized", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("Forbidden"));

    expect(await updateUserAction(validPayload)).toEqual({
      success: false,
      error: "You don't have permission to edit users.",
    });
  });

  it("returns an error for an invalid payload", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);

    expect(
      await updateUserAction({ userId: "bad-id", email: "test@law.com", role: "Lawyer" }),
    ).toEqual({
      success: false,
      error: "Invalid input",
    });
  });

  it("returns an error when the user is not found", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);
    vi.mocked(getUserById).mockResolvedValue(null);

    const result = await updateUserAction(validPayload);

    expect(result).toEqual({
      success: false,
      error: "User not found.",
    });
  });

  it("returns an error when the target is a Dev account", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);
    vi.mocked(getUserById).mockResolvedValue({ id: uuid, role: Role.Dev, is_active: true });

    const result = await updateUserAction(validPayload);

    expect(result).toEqual({
      success: false,
      error: "Cannot edit developer accounts.",
    });
  });

  it("returns an error on duplicate email", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);
    vi.mocked(getUserById).mockResolvedValue({ id: uuid, role: "Paralegal", is_active: true });
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "other-id",
      role: "Lawyer",
      is_active: true,
    });

    const result = await updateUserAction(validPayload);

    expect(result).toEqual({
      success: false,
      error: "A user with this email already exists.",
    });
  });

  it("updates a user successfully", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);
    vi.mocked(getUserById).mockResolvedValue({ id: uuid, role: "Paralegal", is_active: true });
    vi.mocked(getUserByEmail).mockResolvedValue({ id: uuid, role: "Paralegal", is_active: true });
    vi.mocked(updateUser).mockResolvedValue(undefined);

    const result = await updateUserAction(validPayload);

    expect(result).toEqual({ success: true });
    expect(updateUser).toHaveBeenCalledWith(uuid, { email: "updated@law.com", role: "Paralegal" });
  });

  it("returns an error when the update fails", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);
    vi.mocked(getUserById).mockResolvedValue({ id: uuid, role: "Paralegal", is_active: true });
    vi.mocked(getUserByEmail).mockResolvedValue({ id: uuid, role: "Paralegal", is_active: true });
    vi.mocked(updateUser).mockRejectedValue(new Error("db error"));

    const result = await updateUserAction(validPayload);

    expect(result).toEqual({
      success: false,
      error: "Failed to update user.",
    });
  });
});

describe("deactivateUserAction", () => {
  const validPayload = { userId: uuid };

  it("returns an error when unauthorized", async () => {
    vi.mocked(requireRole).mockRejectedValue(new Error("Forbidden"));

    expect(await deactivateUserAction(validPayload)).toEqual({
      success: false,
      error: "Only admins and developers can deactivate users.",
    });
  });

  it("returns an error for an invalid payload", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);

    expect(await deactivateUserAction({ userId: "bad-id" })).toEqual({
      success: false,
      error: "Invalid user ID",
    });
  });

  it("returns an error when the user is not found", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);
    vi.mocked(getUserById).mockResolvedValue(null);

    const result = await deactivateUserAction(validPayload);

    expect(result).toEqual({
      success: false,
      error: "User not found.",
    });
  });

  it("returns an error when deactivating the last active Admin/Dev", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);
    vi.mocked(getUserById).mockResolvedValue({ id: uuid, role: Role.Admin, is_active: true });
    vi.mocked(countActiveAdminsAndDevs).mockResolvedValue(0);

    const result = await deactivateUserAction(validPayload);

    expect(result).toEqual({
      success: false,
      error: "Cannot deactivate the last admin or developer.",
    });
  });

  it("deactivates a regular user successfully", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);
    vi.mocked(getUserById).mockResolvedValue({ id: uuid, role: "Paralegal", is_active: true });
    vi.mocked(setUserActiveStatus).mockResolvedValue(undefined);

    const result = await deactivateUserAction(validPayload);

    expect(result).toEqual({ success: true, data: { selfDeactivated: false } });
    expect(setUserActiveStatus).toHaveBeenCalledWith(uuid, false);
  });

  it("deactivates an Admin when other admins remain", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);
    vi.mocked(getUserById).mockResolvedValue({ id: uuid, role: Role.Admin, is_active: true });
    vi.mocked(countActiveAdminsAndDevs).mockResolvedValue(1);
    vi.mocked(setUserActiveStatus).mockResolvedValue(undefined);

    const result = await deactivateUserAction(validPayload);

    expect(result).toEqual({ success: true, data: { selfDeactivated: false } });
    expect(setUserActiveStatus).toHaveBeenCalledWith(uuid, false);
  });

  it("returns an error when deactivation fails", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);
    vi.mocked(getUserById).mockResolvedValue({ id: uuid, role: "Paralegal", is_active: true });
    vi.mocked(setUserActiveStatus).mockRejectedValue(new Error("db error"));

    const result = await deactivateUserAction(validPayload);

    expect(result).toEqual({
      success: false,
      error: "Failed to deactivate user.",
    });
  });

  it("flags self-deactivation when the target is the current user", async () => {
    vi.mocked(requireRole).mockResolvedValue(sessionAdmin);
    vi.mocked(getUserById).mockResolvedValue({
      id: sessionAdmin.id,
      role: "Admin",
      is_active: true,
    });
    vi.mocked(countActiveAdminsAndDevs).mockResolvedValue(1);
    vi.mocked(setUserActiveStatus).mockResolvedValue(undefined);

    const result = await deactivateUserAction({ userId: sessionAdmin.id });

    expect(result).toEqual({ success: true, data: { selfDeactivated: true } });
  });
});
