import { describe, expect, it, vi } from "vitest";

import { diffNewAssigneeIds, resolveAssignmentRecipients } from "../recipients";

const directIds = ["u-1", "u-2"];

describe("resolveAssignmentRecipients", () => {
  it("returns direct user ids when provided", async () => {
    const result = await resolveAssignmentRecipients({
      directUserIds: directIds,
    });

    expect(result).toEqual(directIds);
  });

  it("does not fall back to existing assignees when directUserIds is an empty array", async () => {
    const getExisting = vi.fn().mockResolvedValue(["u-3"]);

    const result = await resolveAssignmentRecipients({
      directUserIds: [],
      entityId: "c-1",
      getExistingDirectUserIds: getExisting,
    });

    expect(result).toEqual([]);
    expect(getExisting).not.toHaveBeenCalled();
  });

  it("falls back to existing assignees when directUserIds is undefined", async () => {
    const getExisting = vi.fn().mockResolvedValue(directIds);

    const result = await resolveAssignmentRecipients({
      entityId: "c-1",
      getExistingDirectUserIds: getExisting,
    });

    expect(result).toEqual(directIds);
    expect(getExisting).toHaveBeenCalledWith("c-1");
  });

  it("returns an empty array when there are no direct ids and no fallback", async () => {
    const result = await resolveAssignmentRecipients({});

    expect(result).toEqual([]);
  });
});

describe("diffNewAssigneeIds", () => {
  it("returns only ids not already present", () => {
    expect(diffNewAssigneeIds(["a", "b", "c"], ["b"])).toEqual(["a", "c"]);
  });

  it("returns an empty array when incoming is undefined", () => {
    expect(diffNewAssigneeIds(undefined, ["b"])).toEqual([]);
  });

  it("returns an empty array when all ids already exist", () => {
    expect(diffNewAssigneeIds(["b"], ["b"])).toEqual([]);
  });
});
