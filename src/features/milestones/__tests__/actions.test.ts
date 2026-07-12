import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { deleteMilestoneAction } from "../actions";

vi.mock("@/lib/auth-guards", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u1", email: "e", role: "admin", name: "n" }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    caseMilestone: { findUnique: vi.fn(), delete: vi.fn() },
  },
}));

const uuid = "550e8400-e29b-41d4-a716-446655440000";

const milestoneRecord = {
  id: uuid,
  title: "Initial Filing",
  description: null,
  due_date: new Date("2024-07-15"),
  status: "Pending",
  case_id: "c1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteMilestoneAction", () => {
  it("returns an error for an invalid payload", async () => {
    expect(await deleteMilestoneAction({})).toEqual({
      success: false,
      error: "Invalid milestone ID",
    });
  });

  it("returns an error for a non-uuid milestoneId", async () => {
    expect(await deleteMilestoneAction({ milestoneId: "abc" })).toEqual({
      success: false,
      error: "Invalid milestone ID",
    });
  });

  it("returns an error when the milestone is not found", async () => {
    vi.mocked(prisma.caseMilestone.findUnique).mockResolvedValue(null);

    expect(await deleteMilestoneAction({ milestoneId: uuid })).toEqual({
      success: false,
      error: "Milestone not found",
    });
  });

  it("deletes the milestone and revalidates the case path", async () => {
    vi.mocked(prisma.caseMilestone.findUnique).mockResolvedValue(milestoneRecord);

    const result = await deleteMilestoneAction({ milestoneId: uuid });

    expect(result).toEqual({ success: true });
    expect(prisma.caseMilestone.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: uuid } }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/case/c1");
  });

  it("returns an error when deletion fails", async () => {
    vi.mocked(prisma.caseMilestone.findUnique).mockResolvedValue(milestoneRecord);
    vi.mocked(prisma.caseMilestone.delete).mockRejectedValue(new Error("db error"));

    expect(await deleteMilestoneAction({ milestoneId: uuid })).toEqual({
      success: false,
      error: "Failed to delete milestone",
    });
  });
});