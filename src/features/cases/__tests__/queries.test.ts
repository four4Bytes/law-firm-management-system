import { beforeEach, describe, expect, it, vi } from "vitest";

import { getEntityActivityLogPaginated } from "@/features/audit/queries";
import { type Case } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";

import {
  getCaseEditData,
  getCaseMilestonesPaginated,
  getCaseNotesPaginated,
  getCaseOverviewById,
  getCasePaymentsPaginated,
  getCasesPaginated,
  getCaseTasksPaginated,
} from "../queries";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { findMany: vi.fn() },
    case: { findMany: vi.fn(), findUnique: vi.fn() },
    caseMilestone: { findMany: vi.fn() },
    note: { findMany: vi.fn() },
    payment: { findMany: vi.fn() },
    task: { findMany: vi.fn() },
  },
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

  it("sorts by case_title ascending", async () => {
    vi.mocked(prisma.case.findMany).mockResolvedValue([]);
    await getCasesPaginated({ sort: { column: "case_title", direction: "asc" } });
    expect(prisma.case.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ case_title: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by clientName descending", async () => {
    vi.mocked(prisma.case.findMany).mockResolvedValue([]);
    await getCasesPaginated({ sort: { column: "clientName", direction: "desc" } });
    expect(prisma.case.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ client: { name: "desc" } }, { id: "asc" }] }),
    );
  });

  it("sorts by case_type ascending", async () => {
    vi.mocked(prisma.case.findMany).mockResolvedValue([]);
    await getCasesPaginated({ sort: { column: "case_type", direction: "asc" } });
    expect(prisma.case.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ case_type: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by status ascending", async () => {
    vi.mocked(prisma.case.findMany).mockResolvedValue([]);
    await getCasesPaginated({ sort: { column: "status", direction: "asc" } });
    expect(prisma.case.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ status: "asc" }, { id: "asc" }] }),
    );
  });

  it("falls back to default orderBy for unknown sort column", async () => {
    vi.mocked(prisma.case.findMany).mockResolvedValue([]);
    await getCasesPaginated({ sort: { column: "unknown", direction: "asc" } });
    expect(prisma.case.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { created_at: "desc" } }),
    );
  });
});

describe("getCaseOverviewById", () => {
  const mockFullCase = (overrides: Record<string, unknown> = {}) => ({
    id: "1",
    case_title: "Smith vs Jones",
    case_type: "Civil",
    status: "Open" as const,
    client_id: "c1",
    source_consultation_id: null,
    parties_involved: "Smith (Plaintiff), Jones (Defendant)",
    created_by_user_id: "u1",
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    client: {
      id: "c1",
      name: "Alice Client",
      phone_number: "09170000001",
      email: "alice@email.com",
      address: "123 Rizal St.",
      created_at: new Date("2024-01-01"),
      updated_at: new Date("2024-06-01"),
    },
    createdBy: { name: "Bob Lawyer" },
    caseAssignments: [{ user: { name: "Bob Lawyer" } }, { user: { name: "Carol Paralegal" } }],
    milestones: [
      {
        title: "File complaint",
        status: "Pending" as const,
        id: "m1",
        case_id: "1",
        description: null,
        due_date: new Date("2024-07-01"),
        created_by_user_id: "u1",
        created_at: new Date("2024-06-01"),
        updated_at: new Date("2024-06-01"),
      },
    ],
    sourceConsultation: { id: "con1", concern: "Breach of contract" },
    ...overrides,
  });

  it("returns mapped overview data", async () => {
    const data = mockFullCase();
    vi.mocked(prisma.case.findUnique).mockResolvedValue(data);

    const result = await getCaseOverviewById("1");

    expect(result).toEqual({
      id: "1",
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
      parties_involved: "Smith (Plaintiff), Jones (Defendant)",
      created_at: data.created_at,
      updated_at: data.updated_at,
      client: {
        name: "Alice Client",
        phone_number: "09170000001",
        email: "alice@email.com",
        address: "123 Rizal St.",
      },
      createdBy: { name: "Bob Lawyer" },
      assignTo: "Bob Lawyer, Carol Paralegal",
      latestMilestone: { title: "File complaint", status: "Pending" },
      sourceConsultation: { id: "con1", concern: "Breach of contract" },
    });
    expect(prisma.case.findUnique).toHaveBeenCalledWith({
      where: { id: "1" },
      include: {
        client: true,
        createdBy: { select: { name: true } },
        caseAssignments: { include: { user: { select: { name: true } } } },
        milestones: { orderBy: { created_at: "desc" }, take: 1 },
        sourceConsultation: { select: { id: true, concern: true } },
      },
    });
  });

  it("handles case with no milestones or source consultation", async () => {
    const data = mockFullCase({
      milestones: [],
      sourceConsultation: null,
    });
    vi.mocked(prisma.case.findUnique).mockResolvedValue(data);

    const result = await getCaseOverviewById("1");

    expect(result.latestMilestone).toBeNull();
    expect(result.sourceConsultation).toBeNull();
  });

  it("calls notFound when case does not exist", async () => {
    const { notFound } = await import("next/navigation");
    vi.mocked(prisma.case.findUnique).mockResolvedValue(null);
    const notFoundMock = vi.mocked(notFound);
    notFoundMock.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(getCaseOverviewById("999")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledOnce();
  });
});

describe("getCaseTasksPaginated", () => {
  const mockTask = (overrides: Record<string, unknown> = {}) => ({
    id: "t1",
    title: "Draft complaint",
    description: null,
    status: "Ongoing" as const,
    case_id: "1",
    created_by_user_id: "u1",
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-02"),
    taskAssignments: [{ user: { name: "Bob Lawyer" } }],
    ...overrides,
  });

  it("returns mapped task rows", async () => {
    const tasks = [
      mockTask(),
      mockTask({
        id: "t2",
        title: "Review evidence",
        taskAssignments: [{ user: { name: "Carol Paralegal" } }],
      }),
    ];
    vi.mocked(prisma.task.findMany).mockResolvedValue(tasks);

    const result = await getCaseTasksPaginated({ caseId: "1", pageSize: 10 });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "t1",
      title: "Draft complaint",
      status: "Ongoing",
      assignTo: "Bob Lawyer",
      updated_at: tasks[0].updated_at,
    });
    expect(result.rows[1]).toEqual({
      id: "t2",
      title: "Review evidence",
      status: "Ongoing",
      assignTo: "Carol Paralegal",
      updated_at: tasks[1].updated_at,
    });
    expect(prisma.task.findMany).toHaveBeenCalledWith({
      take: 11,
      skip: 0,
      where: { case_id: "1" },
      orderBy: { updated_at: "desc" },
      include: { taskAssignments: { include: { user: { select: { name: true } } } } },
    });
  });

  it("filters by search term", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([mockTask()]);

    await getCaseTasksPaginated({ caseId: "1", search: "draft" });

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { case_id: "1", title: { contains: "draft", mode: "insensitive" } },
      }),
    );
  });

  it("handles cursor pagination", async () => {
    const tasks = Array.from({ length: 4 }, (_, i) => mockTask({ id: String(i + 1) }));
    vi.mocked(prisma.task.findMany).mockResolvedValue(tasks);

    const result = await getCaseTasksPaginated({ caseId: "1", pageSize: 3 });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("returns empty array when no tasks", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);

    const result = await getCaseTasksPaginated({ caseId: "1" });

    expect(result.rows).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("sorts by title ascending", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    await getCaseTasksPaginated({ caseId: "1", sort: { column: "title", direction: "asc" } });
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ title: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by title descending", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    await getCaseTasksPaginated({ caseId: "1", sort: { column: "title", direction: "desc" } });
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ title: "desc" }, { id: "asc" }] }),
    );
  });

  it("sorts by status ascending", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    await getCaseTasksPaginated({ caseId: "1", sort: { column: "status", direction: "asc" } });
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ status: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by updated_at descending", async () => {
    vi.mocked(prisma.task.findMany).mockResolvedValue([]);
    await getCaseTasksPaginated({ caseId: "1", sort: { column: "updated_at", direction: "desc" } });
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ updated_at: "desc" }, { id: "asc" }] }),
    );
  });
});

describe("getCaseNotesPaginated", () => {
  const mockNote = (overrides: Record<string, unknown> = {}) => ({
    id: "n1",
    content: "Client called about the case",
    case_id: "1",
    consultation_id: null,
    task_id: null,
    created_by_user_id: "u1",
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    createdBy: { name: "Bob Lawyer" },
    ...overrides,
  });

  it("returns mapped note rows", async () => {
    const notes = [
      mockNote(),
      mockNote({ id: "n2", content: "Evidence received", createdBy: { name: "Carol Paralegal" } }),
    ];
    vi.mocked(prisma.note.findMany).mockResolvedValue(notes);

    const result = await getCaseNotesPaginated({ caseId: "1", pageSize: 10 });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "n1",
      content: "Client called about the case",
      author: "Bob Lawyer",
      created_at: notes[0].created_at,
    });
  });

  it("filters by search term", async () => {
    vi.mocked(prisma.note.findMany).mockResolvedValue([mockNote()]);

    await getCaseNotesPaginated({ caseId: "1", search: "evidence" });

    expect(prisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { case_id: "1", content: { contains: "evidence", mode: "insensitive" } },
      }),
    );
  });

  it("handles cursor pagination", async () => {
    const notes = Array.from({ length: 4 }, (_, i) => mockNote({ id: String(i + 1) }));
    vi.mocked(prisma.note.findMany).mockResolvedValue(notes);

    const result = await getCaseNotesPaginated({ caseId: "1", pageSize: 3 });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("returns empty when none exist", async () => {
    vi.mocked(prisma.note.findMany).mockResolvedValue([]);

    const result = await getCaseNotesPaginated({ caseId: "1" });

    expect(result.rows).toEqual([]);
  });
});

describe("getCaseMilestonesPaginated", () => {
  const mockMilestone = (overrides: Record<string, unknown> = {}) => ({
    id: "m1",
    title: "File complaint",
    description: null,
    due_date: new Date("2024-07-01"),
    status: "Pending" as const,
    case_id: "1",
    created_by_user_id: "u1",
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    reminder_days: null,
    last_reminded_at: null,
    ...overrides,
  });

  it("returns mapped milestone rows", async () => {
    const milestones = [
      mockMilestone(),
      mockMilestone({ id: "m2", title: "Pre-trial", due_date: new Date("2024-08-01") }),
    ];
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue(milestones);

    const result = await getCaseMilestonesPaginated({ caseId: "1", pageSize: 10 });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "m1",
      title: "File complaint",
      due_date: milestones[0].due_date,
      status: "Pending",
    });
  });

  it("filters by search term", async () => {
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue([mockMilestone()]);

    await getCaseMilestonesPaginated({ caseId: "1", search: "complaint" });

    expect(prisma.caseMilestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { case_id: "1", title: { contains: "complaint", mode: "insensitive" } },
      }),
    );
  });

  it("handles cursor pagination", async () => {
    const milestones = Array.from({ length: 4 }, (_, i) => mockMilestone({ id: String(i + 1) }));
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue(milestones);

    const result = await getCaseMilestonesPaginated({ caseId: "1", pageSize: 3 });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("returns empty when none exist", async () => {
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue([]);

    const result = await getCaseMilestonesPaginated({ caseId: "1" });

    expect(result.rows).toEqual([]);
  });

  it("sorts by title ascending", async () => {
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue([]);
    await getCaseMilestonesPaginated({
      caseId: "1",
      sort: { column: "title", direction: "asc" },
    });
    expect(prisma.caseMilestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ title: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by title descending", async () => {
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue([]);
    await getCaseMilestonesPaginated({
      caseId: "1",
      sort: { column: "title", direction: "desc" },
    });
    expect(prisma.caseMilestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ title: "desc" }, { id: "asc" }] }),
    );
  });

  it("sorts by due_date ascending", async () => {
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue([]);
    await getCaseMilestonesPaginated({
      caseId: "1",
      sort: { column: "due_date", direction: "asc" },
    });
    expect(prisma.caseMilestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ due_date: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by status descending", async () => {
    vi.mocked(prisma.caseMilestone.findMany).mockResolvedValue([]);
    await getCaseMilestonesPaginated({
      caseId: "1",
      sort: { column: "status", direction: "desc" },
    });
    expect(prisma.caseMilestone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ status: "desc" }, { id: "asc" }] }),
    );
  });
});

describe("getCasePaymentsPaginated", () => {
  const mockPayment = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: "p1",
    amount: 50000,
    payment_date: new Date("2024-06-15"),
    status: "Paid",
    payment_method: "Bank Transfer",
    receipt_number: "RET-2024-001",
    case_id: "1",
    consultation_id: null,
    created_by_user_id: "u1",
    created_at: new Date("2024-06-15"),
    updated_at: new Date("2024-06-15"),
    ...overrides,
  });

  it("returns mapped payment rows", async () => {
    const payments = [mockPayment(), mockPayment({ id: "p2", amount: 25000, status: "Partial" })];
    vi.mocked(prisma.payment.findMany).mockResolvedValue(payments as never[]);

    const result = await getCasePaymentsPaginated({ caseId: "1", pageSize: 10 });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "p1",
      amount: 50000,
      payment_date: payments[0].payment_date,
      payment_method: "Bank Transfer",
      receipt_number: "RET-2024-001",
      status: "Paid",
    });
    expect(result.rows[1]).toEqual({
      id: "p2",
      amount: 25000,
      payment_date: payments[1].payment_date,
      payment_method: "Bank Transfer",
      receipt_number: "RET-2024-001",
      status: "Partial",
    });
  });

  it("filters by search across multiple fields", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([mockPayment()] as never[]);

    await getCasePaymentsPaginated({ caseId: "1", search: "GCash" });

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          case_id: "1",
          OR: [
            { payment_method: { contains: "GCash", mode: "insensitive" } },
            { status: { contains: "GCash", mode: "insensitive" } },
            { receipt_number: { contains: "GCash", mode: "insensitive" } },
          ],
        },
      }),
    );
  });

  it("handles cursor pagination", async () => {
    const payments = Array.from({ length: 4 }, (_, i) => mockPayment({ id: String(i + 1) }));
    vi.mocked(prisma.payment.findMany).mockResolvedValue(payments as never[]);

    const result = await getCasePaymentsPaginated({ caseId: "1", pageSize: 3 });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("returns empty when none exist", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);

    const result = await getCasePaymentsPaginated({ caseId: "1" });

    expect(result.rows).toEqual([]);
  });

  it("sorts by amount ascending", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
    await getCasePaymentsPaginated({
      caseId: "1",
      sort: { column: "amount", direction: "asc" },
    });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ amount: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by amount descending", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
    await getCasePaymentsPaginated({
      caseId: "1",
      sort: { column: "amount", direction: "desc" },
    });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ amount: "desc" }, { id: "asc" }] }),
    );
  });

  it("sorts by payment_date ascending", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
    await getCasePaymentsPaginated({
      caseId: "1",
      sort: { column: "payment_date", direction: "asc" },
    });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ payment_date: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by status descending", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
    await getCasePaymentsPaginated({
      caseId: "1",
      sort: { column: "status", direction: "desc" },
    });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ status: "desc" }, { id: "asc" }] }),
    );
  });
});

describe("getEntityActivityLogPaginated (Case)", () => {
  beforeEach(() => {
    vi.mocked(prisma.case.findMany).mockResolvedValue([]);
  });

  const mockLog = (overrides: Record<string, unknown> = {}) => ({
    id: "l1",
    action: "CREATE",
    actor_user_id: "u1",
    entity_type: "Case",
    entity_id: "1",
    details: "Case created",
    created_at: new Date("2024-06-01"),
    actor: { name: "Bob Lawyer" },
    ...overrides,
  });

  it("returns mapped activity log rows", async () => {
    const logs = [
      mockLog(),
      mockLog({
        id: "l2",
        action: "UPDATE",
        details: "Status changed",
        actor: { name: "Carol Paralegal" },
      }),
    ];
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue(logs);
    vi.mocked(prisma.case.findMany).mockResolvedValue([]);

    const result = await getEntityActivityLogPaginated({
      entityType: "Case",
      entityId: "1",
      pageSize: 10,
    });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "l1",
      action: "CREATE",
      actor: "Bob Lawyer",
      entityType: "Case",
      entityId: "1",
      entityExists: false,
      details: "Case created",
      created_at: logs[0].created_at,
    });
  });

  it("queries with correct entity filter", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([mockLog()]);

    await getEntityActivityLogPaginated({ entityType: "Case", entityId: "1" });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entity_type: "Case", entity_id: "1" },
      }),
    );
  });

  it("filters by search on action and details", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([mockLog()]);

    await getEntityActivityLogPaginated({ entityType: "Case", entityId: "1", search: "created" });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          entity_type: "Case",
          entity_id: "1",
          OR: [
            { action: { contains: "created", mode: "insensitive" } },
            { details: { contains: "created", mode: "insensitive" } },
          ],
        },
      }),
    );
  });

  it("handles cursor pagination", async () => {
    const logs = Array.from({ length: 4 }, (_, i) => mockLog({ id: String(i + 1) }));
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue(logs);

    const result = await getEntityActivityLogPaginated({
      entityType: "Case",
      entityId: "1",
      pageSize: 3,
    });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("returns empty when no logs", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

    const result = await getEntityActivityLogPaginated({ entityType: "Case", entityId: "1" });

    expect(result.rows).toEqual([]);
  });
});

type CaseWithAssignments = Case & { caseAssignments: { user_id: string }[] };

describe("getCaseEditData", () => {
  const caseEditRecord: CaseWithAssignments = {
    id: "1",
    client_id: "c1",
    case_title: "Smith vs Jones",
    case_type: "Civil",
    status: "Open",
    parties_involved: "Smith (Plaintiff)",
    source_consultation_id: null,
    created_by_user_id: "u1",
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    caseAssignments: [],
  };

  it("returns the mapped case edit data", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(caseEditRecord);

    const result = await getCaseEditData("1");

    expect(result).toMatchObject({
      id: "1",
      client_id: "c1",
      case_title: "Smith vs Jones",
      case_type: "Civil",
      status: "Open",
      parties_involved: "Smith (Plaintiff)",
      source_consultation_id: null,
      assignee_ids: [],
    });
    expect(prisma.case.findUnique).toHaveBeenCalledWith({
      where: { id: "1" },
      select: {
        id: true,
        client_id: true,
        case_title: true,
        case_type: true,
        status: true,
        parties_involved: true,
        source_consultation_id: true,
        caseAssignments: {
          select: { user_id: true },
        },
      },
    });
  });

  it("returns null when the case is not found", async () => {
    vi.mocked(prisma.case.findUnique).mockResolvedValue(null);

    const result = await getCaseEditData("1");

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.case.findUnique).mockRejectedValue(error);

    await expect(getCaseEditData("1")).rejects.toThrow(error);
  });
});
