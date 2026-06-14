import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { getCasesPaginated } from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: { case: { findMany: vi.fn() } },
}));

const caseSelect = {
  id: true,
  case_title: true,
  case_type: true,
  created_at: true,
  client: { select: { name: true } },
  caseAssignments: {
    select: { user: { select: { name: true } } },
  },
  milestones: {
    orderBy: { created_at: "desc" as const },
    take: 1,
    select: { title: true, status: true },
  },
} as const;

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
  caseAssignments: [{ user: { name: "Bob Lawyer" } }],
  milestones: [{ title: "File complaint", status: "Pending" as const }],
  ...overrides,
});

describe("getCasesPaginated", () => {
  it("returns mapped case rows", async () => {
    const cases = [
      mockCase(),
      mockCase({
        id: "2",
        case_title: "Estate Planning",
        client: { name: "Carol Client" },
        caseAssignments: [{ user: { name: "Bob Lawyer" } }, { user: { name: "Dave Paralegal" } }],
        milestones: [{ title: "Draft will", status: "Pending" as const }],
      }),
    ];
    vi.mocked(prisma.case.findMany).mockResolvedValue(cases);

    const result = await getCasesPaginated({ pageSize: 10 });

    expect(result.cases).toHaveLength(2);
    expect(result.cases[0]).toEqual({
      id: "1",
      case_title: "Smith vs Jones",
      case_type: "Civil",
      clientName: "Alice Client",
      assignTo: "Bob Lawyer",
      latestMilestone: "File complaint",
      status: "Pending",
      created_at: cases[0].created_at,
    });
    expect(result.cases[1]).toEqual({
      id: "2",
      case_title: "Estate Planning",
      case_type: "Civil",
      clientName: "Carol Client",
      assignTo: "Bob Lawyer, Dave Paralegal",
      latestMilestone: "Draft will",
      status: "Pending",
      created_at: cases[1].created_at,
    });
    expect(prisma.case.findMany).toHaveBeenCalledWith({
      take: 11,
      skip: 0,
      where: undefined,
      orderBy: { created_at: "desc" },
      select: caseSelect,
    });
  });

  it("handles case with no milestones", async () => {
    vi.mocked(prisma.case.findMany).mockResolvedValue([mockCase({ milestones: [] })]);

    const result = await getCasesPaginated({});

    expect(result.cases[0].latestMilestone).toBe("");
    expect(result.cases[0].status).toBeNull();
  });

  it("returns next cursor when there are more results", async () => {
    const cases = Array.from({ length: 4 }, (_, i) => mockCase({ id: String(i + 1) }));
    vi.mocked(prisma.case.findMany).mockResolvedValue(cases);

    const result = await getCasesPaginated({ pageSize: 3 });

    expect(result.cases).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("filters by case title", async () => {
    vi.mocked(prisma.case.findMany).mockResolvedValue([
      mockCase({ id: "1", case_title: "Patent dispute" }),
    ]);

    const result = await getCasesPaginated({ search: "patent" });

    expect(result.cases).toHaveLength(1);
    expect(prisma.case.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { case_title: { contains: "patent", mode: "insensitive" } },
            { client: { name: { contains: "patent", mode: "insensitive" } } },
          ],
        },
      }),
    );
  });

  it("filters by client name", async () => {
    vi.mocked(prisma.case.findMany).mockResolvedValue([
      mockCase({ id: "1", client: { name: "Acme Corp" } }),
    ]);

    const result = await getCasesPaginated({ search: "acme" });

    expect(result.cases).toHaveLength(1);
  });

  it("returns empty when no matches", async () => {
    vi.mocked(prisma.case.findMany).mockResolvedValue([]);

    const result = await getCasesPaginated({ search: "nonexistent" });

    expect(result.cases).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.case.findMany).mockRejectedValue(error);

    await expect(getCasesPaginated({})).rejects.toThrow(error);
  });
});
