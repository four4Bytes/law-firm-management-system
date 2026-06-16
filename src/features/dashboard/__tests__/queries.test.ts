import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import {
  getDashboardStats,
  getOverdueMilestones,
  getRecentCases,
  getUpcomingConsultations,
} from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    case: { count: vi.fn(), findMany: vi.fn() },
    consultation: { count: vi.fn(), findMany: vi.fn() },
    user: { count: vi.fn() },
    caseMilestone: { count: vi.fn(), findMany: vi.fn() },
  },
}));

const mockCase = (overrides: Record<string, unknown> = {}) => ({
  id: "1",
  case_title: "Smith vs Jones",
  case_type: "Civil",
  status: "Open" as const,
  client_id: "c1",
  source_consultation_id: null,
  parties_involved: null,
  created_by_user_id: "u1",
  created_at: new Date("2024-06-01"),
  updated_at: new Date("2024-06-01"),
  client: { name: "Alice Client" },
  ...overrides,
});

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
  ...overrides,
});

const mockMilestone = (overrides: Record<string, unknown> = {}) => ({
  id: "1",
  title: "File complaint",
  description: null,
  due_date: new Date("2024-05-01"),
  status: "Pending" as const,
  case_id: "c1",
  created_by_user_id: "u1",
  created_at: new Date("2024-05-01"),
  updated_at: new Date("2024-05-01"),
  case: { case_title: "Smith vs Jones" },
  ...overrides,
});

describe("getDashboardStats", () => {
  it("returns aggregated stats", async () => {
    vi.mocked(prisma.case.count).mockResolvedValue(5);
    vi.mocked(prisma.consultation.count).mockResolvedValue(3);
    vi.mocked(prisma.user.count).mockResolvedValue(10);
    vi.mocked(prisma.caseMilestone.count).mockResolvedValue(2);

    const result = await getDashboardStats();

    expect(result).toEqual({
      openCases: 5,
      todayConsultations: 3,
      totalUsers: 10,
      overdueMilestones: 2,
    });
  });

  it("returns zero counts when nothing matches", async () => {
    vi.mocked(prisma.case.count).mockResolvedValue(0);
    vi.mocked(prisma.consultation.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.caseMilestone.count).mockResolvedValue(0);

    const result = await getDashboardStats();

    expect(result).toEqual({
      openCases: 0,
      todayConsultations: 0,
      totalUsers: 0,
      overdueMilestones: 0,
    });
  });

  it("queries with correct where clauses", async () => {
    vi.mocked(prisma.case.count).mockResolvedValue(0);
    vi.mocked(prisma.consultation.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.caseMilestone.count).mockResolvedValue(0);

    await getDashboardStats();

    expect(prisma.case.count).toHaveBeenCalledWith({
      where: { status: "Open" },
    });
    expect(prisma.consultation.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "Scheduled",
          booking_datetime: { gte: expect.any(Date), lt: expect.any(Date) },
        },
      }),
    );
    expect(prisma.user.count).toHaveBeenCalledWith({ where: { is_active: true } });
    expect(prisma.caseMilestone.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "Pending",
          due_date: { lt: expect.any(Date) },
        },
      }),
    );
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.case.count).mockRejectedValue(error);

    await expect(getDashboardStats()).rejects.toThrow(error);
  });
});

describe("getRecentCases", () => {
  it("returns recent cases with mapped fields", async () => {
    const cases = [
      mockCase({ id: "1", case_title: "Case A" }),
      mockCase({ id: "2", case_title: "Case B" }),
    ];
    vi.mocked(prisma.case.findMany).mockResolvedValue(cases);

    const result = await getRecentCases();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "1",
      case_title: "Case A",
      clientName: "Alice Client",
      status: "Open",
    });
    expect(prisma.case.findMany).toHaveBeenCalledWith({
      take: 5,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        case_title: true,
        status: true,
        client: { select: { name: true } },
      },
    });
  });

  it("accepts custom limit", async () => {
    vi.mocked(prisma.case.findMany).mockResolvedValue([]);

    await getRecentCases(3);

    expect(prisma.case.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3 }));
  });

  it("returns empty array when none exist", async () => {
    vi.mocked(prisma.case.findMany).mockResolvedValue([]);

    const result = await getRecentCases();

    expect(result).toEqual([]);
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.case.findMany).mockRejectedValue(error);

    await expect(getRecentCases()).rejects.toThrow(error);
  });
});

describe("getUpcomingConsultations", () => {
  it("returns upcoming scheduled consultations", async () => {
    const consultations = [mockConsultation({ id: "1" }), mockConsultation({ id: "2" })];
    vi.mocked(prisma.consultation.findMany).mockResolvedValue(consultations);

    const result = await getUpcomingConsultations();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "1",
      clientName: "Jane Client",
      concern: "Legal advice",
      booking_datetime: consultations[0].booking_datetime,
      status: "Scheduled",
    });
    expect(prisma.consultation.findMany).toHaveBeenCalledWith({
      take: 5,
      where: {
        booking_datetime: { gte: expect.any(Date) },
        status: "Scheduled",
      },
      orderBy: { booking_datetime: "asc" },
      select: {
        id: true,
        concern: true,
        booking_datetime: true,
        status: true,
        client: { select: { name: true } },
      },
    });
  });

  it("returns empty array when none exist", async () => {
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([]);

    const result = await getUpcomingConsultations();

    expect(result).toEqual([]);
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.consultation.findMany).mockRejectedValue(error);

    await expect(getUpcomingConsultations()).rejects.toThrow(error);
  });
});

describe("getOverdueMilestones", () => {
  it("returns overdue milestones with mapped fields", async () => {
    const milestones = [
      mockMilestone({ id: "1", title: "Milestone A" }),
      mockMilestone({ id: "2", title: "Milestone B" }),
    ];
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue(milestones);

    const result = await getOverdueMilestones();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "1",
      caseTitle: "Smith vs Jones",
      milestoneTitle: "Milestone A",
      due_date: milestones[0].due_date,
    });
    expect(prisma.caseMilestone.findMany).toHaveBeenCalledWith({
      take: 5,
      where: {
        status: "Pending",
        due_date: { lt: expect.any(Date) },
      },
      orderBy: { due_date: "asc" },
      select: {
        id: true,
        title: true,
        due_date: true,
        case: { select: { case_title: true } },
      },
    });
  });

  it("returns empty array when none overdue", async () => {
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue([]);

    const result = await getOverdueMilestones();

    expect(result).toEqual([]);
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.caseMilestone.findMany).mockRejectedValue(error);

    await expect(getOverdueMilestones()).rejects.toThrow(error);
  });
});
