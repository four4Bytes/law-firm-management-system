import { beforeEach, describe, expect, it, vi } from "vitest";

import { queue } from "@/components/ui/Toast/Toast";
import { actionForbidden } from "@/lib/action-response";
import {
  toastActionError,
  toastDenied,
  toastError,
  toastInfo,
  toastNotFound,
  toastSuccess,
} from "@/lib/toast-utils";

const addSpy = vi.spyOn(queue, "add").mockImplementation(() => "toast-key");

describe("toast helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toastSuccess enqueues title and description with the standard timeout", () => {
    toastSuccess("Case created", "The case has been created.");

    expect(addSpy).toHaveBeenCalledWith(
      { title: "Case created", description: "The case has been created." },
      { timeout: 5000 },
    );
  });

  it("toastInfo and toastError enqueue both fields", () => {
    toastInfo("Heads up", "Context line.");
    toastError("Upload failed", "Please try again.");

    expect(addSpy).toHaveBeenCalledTimes(2);
    expect(addSpy.mock.calls[0][0]).toEqual({ title: "Heads up", description: "Context line." });
    expect(addSpy.mock.calls[1][0]).toEqual({
      title: "Upload failed",
      description: "Please try again.",
    });
  });

  it("toastActionError renders the structured server error", () => {
    toastActionError(actionForbidden(), "delete case");

    expect(addSpy).toHaveBeenCalledWith(
      {
        title: "Access denied",
        description: "You don't have permission to perform this action.",
      },
      { timeout: 5000 },
    );
  });

  it("toastActionError falls back to the unknown envelope when error is missing", () => {
    toastActionError({ success: false }, "update task");

    expect(addSpy).toHaveBeenCalledWith(
      {
        title: "Failed to update task",
        description: "Something went wrong on our end. Please try again.",
      },
      { timeout: 5000 },
    );
  });

  it("toastDenied mirrors the forbidden preset copy", () => {
    toastDenied();

    expect(addSpy).toHaveBeenCalledWith(
      {
        title: "Access denied",
        description: "You don't have permission to perform this action.",
      },
      { timeout: 5000 },
    );
  });

  it("toastNotFound renders the entity-specific not-found copy", () => {
    toastNotFound("Milestone");

    expect(addSpy).toHaveBeenCalledWith(
      {
        title: "Milestone not found",
        description: "The milestone may have been deleted by another user.",
      },
      { timeout: 5000 },
    );
  });
});
