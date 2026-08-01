import { beforeEach, describe, expect, it, vi } from "vitest";

import { getActiveUserIdsByRoles } from "@/features/users/queries";
import { NotificationType } from "@/generated/prisma/browser";

import { diffNewAssigneeIds, resolveAssignmentRecipients } from "../recipients";

vi.mock("@/features/users/queries", () => ({
  getActiveUserIdsByRoles: vi.fn(),
}));

const roleIds = ["role-1", "role-2"];
const directIds = ["u-1", "u-2"];

beforeEach(() => {
  vi.mocked(getActiveUserIdsByRoles).mockResolvedValue(roleIds);
});

describe("resolveAssignmentRecipients", () => {
  it("merges role recipients with direct user ids, deduped", async () => {
    const result = await resolveAssignmentRecipients({
      type: NotificationType.ConsultationAssigned,
      directUserIds: [...directIds, "role-1"],
    });

    expect(result).toEqual(["role-1", "role-2", "u-1", "u-2"]);
  });

  it("does not fall back to existing assignees when directUserIds is an empty array", async () => {
    const getExisting = vi.fn().mockResolvedValue(directIds);

    const result = await resolveAssignmentRecipients({
      type: NotificationType.ConsultationAssigned,
      directUserIds: [],
      entityId: "c-1",
      getExistingDirectUserIds: getExisting,
    });

    expect(result).toEqual(roleIds);
    expect(getExisting).not.toHaveBeenCalled();
  });

  it("falls back to existing assignees when directUserIds is undefined", async () => {
    const getExisting = vi.fn().mockResolvedValue(directIds);

    const result = await resolveAssignmentRecipients({
      type: NotificationType.ConsultationAssigned,
      entityId: "c-1",
      getExistingDirectUserIds: getExisting,
    });

    expect(result).toEqual([...roleIds, ...directIds]);
    expect(getExisting).toHaveBeenCalledWith("c-1");
  });

  it("returns role recipients only when there are no direct ids and no fallback", async () => {
    const result = await resolveAssignmentRecipients({
      type: NotificationType.ConsultationAssigned,
    });

    expect(result).toEqual(roleIds);
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
