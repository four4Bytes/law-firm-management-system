import { beforeEach, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { createMilestone, deleteMilestone, updateMilestone } from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: { caseMilestone: { create: vi.fn(), update: vi.fn(), delete: vi.fn() } },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

it("creates a milestone", async () => {
  vi.mocked(prisma.caseMilestone.create).mockResolvedValue({
    id: "m1",
    title: "Initial Filing",
    description: null,
    due_date: new Date("2024-07-15"),
    status: "Pending",
    case_id: "c1",
    created_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  } as never);

  const result = await createMilestone({
    title: "Initial Filing",
    due_date: new Date("2024-07-15"),
    status: "Pending",
    case_id: "c1",
    created_by_user_id: "u1",
  });

  expect(result.id).toBe("m1");
  expect(prisma.caseMilestone.create).toHaveBeenCalledWith({
    data: {
      title: "Initial Filing",
      description: null,
      due_date: new Date("2024-07-15"),
      status: "Pending",
      case_id: "c1",
      created_by_user_id: "u1",
    },
    select: { id: true },
  });
});

it("creates a milestone with description", async () => {
  vi.mocked(prisma.caseMilestone.create).mockResolvedValue({
    id: "m2",
    title: "Court Hearing",
    description: "Attend the hearing",
    due_date: new Date("2024-08-01"),
    status: "Pending",
    case_id: "c1",
    created_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  } as never);

  await createMilestone({
    title: "Court Hearing",
    description: "Attend the hearing",
    due_date: new Date("2024-08-01"),
    status: "Pending",
    case_id: "c1",
    created_by_user_id: "u1",
  });

  expect(prisma.caseMilestone.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      description: "Attend the hearing",
    }),
    select: { id: true },
  });
});

it("updates a milestone", async () => {
  vi.mocked(prisma.caseMilestone.update).mockResolvedValue({
    id: "m1",
    title: "Updated Title",
    description: null,
    due_date: new Date("2024-07-20"),
    status: "Done",
    case_id: "c1",
    created_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  } as never);

  const result = await updateMilestone("m1", {
    title: "Updated Title",
    due_date: new Date("2024-07-20"),
    status: "Done",
  });

  expect(result.id).toBe("m1");
  expect(prisma.caseMilestone.update).toHaveBeenCalledWith({
    where: { id: "m1" },
    data: {
      title: "Updated Title",
      description: null,
      due_date: new Date("2024-07-20"),
      status: "Done",
    },
    select: { id: true },
  });
});

it("updates a milestone with description", async () => {
  vi.mocked(prisma.caseMilestone.update).mockResolvedValue({
    id: "m1",
    title: "Updated",
    description: "New description",
    due_date: new Date("2024-08-01"),
    status: "Cancelled",
    case_id: "c1",
    created_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  } as never);

  await updateMilestone("m1", {
    title: "Updated",
    description: "New description",
    due_date: new Date("2024-08-01"),
    status: "Cancelled",
  });

  expect(prisma.caseMilestone.update).toHaveBeenCalledWith({
    where: { id: "m1" },
    data: {
      title: "Updated",
      description: "New description",
      due_date: new Date("2024-08-01"),
      status: "Cancelled",
    },
    select: { id: true },
  });
});

it("deletes a milestone", async () => {
  vi.mocked(prisma.caseMilestone.delete).mockResolvedValue({
    id: "m1",
    title: "Test",
    description: null,
    due_date: new Date("2024-07-15"),
    status: "Pending",
    case_id: "c1",
    created_by_user_id: "u1",
    created_at: new Date(),
    updated_at: new Date(),
  } as never);

  const result = await deleteMilestone("m1");

  expect(result.id).toBe("m1");
  expect(prisma.caseMilestone.delete).toHaveBeenCalledWith({
    where: { id: "m1" },
    select: { id: true },
  });
});

it("propagates error when deleting nonexistent milestone", async () => {
  const error = new Error("Record not found");
  vi.mocked(prisma.caseMilestone.delete).mockRejectedValue(error);

  await expect(deleteMilestone("999")).rejects.toThrow(error);
});

it("propagates error when updating nonexistent milestone", async () => {
  const error = new Error("Record not found");
  vi.mocked(prisma.caseMilestone.update).mockRejectedValue(error);

  await expect(
    updateMilestone("999", {
      title: "Test",
      due_date: new Date("2024-07-15"),
      status: "Pending",
    }),
  ).rejects.toThrow(error);
});

it("propagates error when creating milestone fails", async () => {
  const error = new Error("Database connection failed");
  vi.mocked(prisma.caseMilestone.create).mockRejectedValue(error);

  await expect(
    createMilestone({
      title: "Test",
      due_date: new Date("2024-07-15"),
      status: "Pending",
      case_id: "c1",
      created_by_user_id: "u1",
    }),
  ).rejects.toThrow(error);
});
