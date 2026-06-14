import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { getConsultationsPaginated } from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: { consultation: { findMany: vi.fn() } },
}));

const consultationSelect = {
  id: true,
  concern: true,
  booking_datetime: true,
  status: true,
  client: { select: { name: true } },
  createdBy: { select: { name: true } },
} as const;

const mockConsultation = (overrides: Record<string, unknown> = {}) => ({
  id: "1",
  concern: "Legal advice",
  booking_datetime: new Date("2024-06-01T10:00:00"),
  status: "Scheduled" as const,
  client_id: "c1",
  created_by_user_id: "u1",
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  client: { name: "Jane Client" },
  createdBy: { name: "John Lawyer" },
  ...overrides,
});

describe("getConsultationsPaginated", () => {
  it("returns mapped consultation rows", async () => {
    const consultations = [
      mockConsultation(),
      mockConsultation({
        id: "2",
        concern: "Contract review",
        client: { name: "Bob Client" },
        createdBy: { name: "Alice Lawyer" },
      }),
    ];
    vi.mocked(prisma.consultation.findMany).mockResolvedValue(consultations);

    const result = await getConsultationsPaginated({ pageSize: 10 });

    expect(result.consultations).toHaveLength(2);
    expect(result.consultations[0]).toEqual({
      id: "1",
      clientName: "Jane Client",
      concern: "Legal advice",
      createdByName: "John Lawyer",
      booking_datetime: consultations[0].booking_datetime,
      status: "Scheduled",
    });
    expect(result.consultations[1]).toEqual({
      id: "2",
      clientName: "Bob Client",
      concern: "Contract review",
      createdByName: "Alice Lawyer",
      booking_datetime: consultations[1].booking_datetime,
      status: "Scheduled",
    });
    expect(prisma.consultation.findMany).toHaveBeenCalledWith({
      take: 11,
      skip: 0,
      where: undefined,
      orderBy: { booking_datetime: "desc" },
      select: consultationSelect,
    });
  });

  it("returns next cursor when there are more results", async () => {
    const consultations = Array.from({ length: 4 }, (_, i) =>
      mockConsultation({ id: String(i + 1) }),
    );
    vi.mocked(prisma.consultation.findMany).mockResolvedValue(consultations);

    const result = await getConsultationsPaginated({ pageSize: 3 });

    expect(result.consultations).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("filters by concern", async () => {
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([
      mockConsultation({ id: "1", concern: "Tax issue" }),
    ]);

    const result = await getConsultationsPaginated({ search: "tax" });

    expect(result.consultations).toHaveLength(1);
    expect(prisma.consultation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { concern: { contains: "tax", mode: "insensitive" } },
            { client: { name: { contains: "tax", mode: "insensitive" } } },
          ],
        },
      }),
    );
  });

  it("filters by client name", async () => {
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([
      mockConsultation({ id: "1", client: { name: "Acme Corp" } }),
    ]);

    const result = await getConsultationsPaginated({ search: "acme" });

    expect(result.consultations).toHaveLength(1);
  });

  it("returns empty when no matches", async () => {
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([]);

    const result = await getConsultationsPaginated({ search: "nonexistent" });

    expect(result.consultations).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.consultation.findMany).mockRejectedValue(error);

    await expect(getConsultationsPaginated({})).rejects.toThrow(error);
  });
});
