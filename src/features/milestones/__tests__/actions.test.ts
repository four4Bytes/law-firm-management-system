import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/browser";
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

const milestoneRecord: Prisma.CaseMilestoneGetPayload<{
  select: {
    id: true;
    title: true;
    description: true;
    due_date: true;
    status: true;
    case_id: true;
    created_at: true;
    updated_at: true;
    created_by_user_id: true;
  };
}> = {
  id: uuid,
  title: "Initial Filing",
  description: null,
  due_date: new Date("2024-07-15"),
  status: "Pending",
  case_id: "c1",
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  created_by_user_id: "u1",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("deleteMilestoneAction", () => {
  it("returns an error for an invalid payload", async () => {
    expect(await deleteMilestoneAction("")).toEqual({
      success: false,
      error: "Invalid milestone ID",
    });
  });

  it("returns an error for a non-uuid milestoneId", async () => {
    expect(await deleteMilestoneAction("abc")).toEqual({
      success: false,
      error: "Invalid milestone ID",
    });
  });

  it("returns an error when the milestone is not found", async () => {
    vi.mocked(prisma.caseMilestone.findUnique).mockResolvedValue(null);

    expect(await deleteMilestoneAction(uuid)).toEqual({
      success: false,
      error: "Milestone not found",
    });
  });

  it("deletes the milestone and revalidates the case path", async () => {
    vi.mocked(prisma.caseMilestone.findUnique).mockResolvedValue(milestoneRecord);

    const result = await deleteMilestoneAction(uuid);

    expect(result).toEqual({ success: true });
    expect(prisma.caseMilestone.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: uuid } }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/case/c1");
  });

  it("returns an error when deletion fails", async () => {
    vi.mocked(prisma.caseMilestone.findUnique).mockResolvedValue(milestoneRecord);
    vi.mocked(prisma.caseMilestone.delete).mockRejectedValue(new Error("db error"));

    expect(await deleteMilestoneAction(uuid)).toEqual({
      success: false,
      error: "Failed to delete milestone",
    });
  });
});