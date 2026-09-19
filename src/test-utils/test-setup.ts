import { vi } from "vitest";

import { requireAuth, requirePermission, type AuthenticatedUser } from "@/lib/auth-guards";

import { mockSessionUser } from "./fixtures";

interface PermissionStub {
  mockResolvedValue?: (session: AuthenticatedUser) => void;
  mockRejectedValue?: (error: unknown) => void;
}

function permissionMock(): PermissionStub | null {
  try {
    return requirePermission as unknown as PermissionStub;
  } catch {
    // Files mocking only requireAuth have no requirePermission export to drive.
    return null;
  }
}

export function setupAuth(session: AuthenticatedUser = mockSessionUser()): AuthenticatedUser {
  vi.mocked(requireAuth).mockResolvedValue(session);
  permissionMock()?.mockResolvedValue?.(session);
  return session;
}

export function setupAuthError(error: unknown): void {
  vi.mocked(requireAuth).mockRejectedValue(error);
  permissionMock()?.mockRejectedValue?.(error);
}
