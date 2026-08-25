import { beforeEach, describe, expect, it, vi } from "vitest";

import { actionForbidden } from "@/lib/action-response";
import { ForbiddenError, TaskLockedError, toActionResponse, UnauthorizedError } from "@/lib/errors";

const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

describe("toActionResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps ForbiddenError to the forbidden preset", () => {
    expect(toActionResponse(new ForbiddenError(), "update case")).toEqual(actionForbidden());
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("maps UnauthorizedError to the unauthorized preset", () => {
    expect(toActionResponse(new UnauthorizedError(), "update case")).toEqual({
      success: false,
      error: {
        code: "unauthorized",
        title: "Session expired",
        description: "Please sign in again to continue.",
      },
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("maps TaskLockedError to the locked preset", () => {
    expect(toActionResponse(new TaskLockedError(), "create note")).toEqual({
      success: false,
      error: {
        code: "locked",
        title: "Task locked",
        description: "This task is cancelled and its attachments are locked",
      },
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("maps a Prisma P2002 violation using the supplied conflict copy", () => {
    const p2002 = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

    expect(
      toActionResponse(p2002, "create case", {
        title: "Case already exists",
        description: "A case already exists for this consultation.",
      }),
    ).toEqual({
      success: false,
      error: {
        code: "conflict",
        title: "Case already exists",
        description: "A case already exists for this consultation.",
      },
    });
  });

  it("falls back to the unknown envelope when P2002 has no conflict copy", () => {
    const p2002 = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

    const result = toActionResponse(p2002, "create user");

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("unknown");
    expect(result.error?.title).toBe("Failed to create user");
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it("logs and returns the unknown fallback for unclassified errors", () => {
    const boom = new Error("connection refused");

    const result = toActionResponse(boom, "delete payment");

    expect(result).toEqual({
      success: false,
      error: {
        code: "unknown",
        title: "Failed to delete payment",
        description: "Something went wrong on our end. Please try again.",
      },
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "[delete payment]",
      expect.stringContaining("connection refused"),
    );
  });
});
