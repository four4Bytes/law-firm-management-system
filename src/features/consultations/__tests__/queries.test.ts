import { beforeEach, describe, expect, it, vi } from "vitest";

import { getEntityActivityLogPaginated } from "@/features/audit/queries";
import { prisma } from "@/lib/prisma";

import {
  getConsultationAssigneeIds,
  getConsultationEditData,
  getConsultationNotesPaginated,
  getConsultationOverviewById,
  getConsultationsPaginated,
} from "../queries";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { findMany: vi.fn() },
    consultation: { findMany: vi.fn(), findUnique: vi.fn() },
    consultationAssignment: { findMany: vi.fn() },
    note: { findMany: vi.fn() },
    payment: { findMany: vi.fn() },
  },
}));

const consultationSelect = {
  id: true,
  concern: true,
  booking_datetime: true,
  status: true,
  client: { select: { name: true } },
  createdBy: { select: { name: true } },
  consultationAssignments: {
    where: { user: { is_active: true } },
    select: { user: { select: { name: true } } },
    orderBy: [{ created_at: "asc" }, { user: { name: "asc" } }, { user_id: "asc" }],
  },
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
  reminder_days: null,
  last_reminded_at: null,
  client: { name: "Jane Client" },
  createdBy: { name: "John Lawyer" },
  consultationAssignments: [],
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
      assignTo: "",
      booking_datetime: consultations[0].booking_datetime,
      status: "Scheduled",
    });
    expect(result.consultations[1]).toEqual({
      id: "2",
      clientName: "Bob Client",
      concern: "Contract review",
      createdByName: "Alice Lawyer",
      assignTo: "",
      booking_datetime: consultations[1].booking_datetime,
      status: "Scheduled",
    });
    expect(prisma.consultation.findMany).toHaveBeenCalledWith({
      take: 11,
      skip: 0,
      where: {},
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

  it("joins assignee names into the assignTo column", async () => {
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([
      mockConsultation({
        consultationAssignments: [
          { user: { name: "John Lawyer" } },
          { user: { name: "Alice Paralegal" } },
        ],
      }),
    ]);

    const result = await getConsultationsPaginated({ pageSize: 10 });

    expect(result.consultations[0].assignTo).toBe("John Lawyer, Alice Paralegal");
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.consultation.findMany).mockRejectedValue(error);

    await expect(getConsultationsPaginated({})).rejects.toThrow(error);
  });

  it("filters by assigned user", async () => {
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([mockConsultation()]);

    await getConsultationsPaginated({ pageSize: 10 }, "u2");

    expect(prisma.consultation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { consultationAssignments: { some: { user_id: "u2" } } },
      }),
    );
  });

  it("sorts by concern ascending", async () => {
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([]);
    await getConsultationsPaginated({ sort: { column: "concern", direction: "asc" } });
    expect(prisma.consultation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ concern: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by clientName descending", async () => {
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([]);
    await getConsultationsPaginated({ sort: { column: "clientName", direction: "desc" } });
    expect(prisma.consultation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ client: { name: "desc" } }, { id: "asc" }] }),
    );
  });

  it("sorts by createdByName ascending", async () => {
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([]);
    await getConsultationsPaginated({ sort: { column: "createdByName", direction: "asc" } });
    expect(prisma.consultation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ createdBy: { name: "asc" } }, { id: "asc" }] }),
    );
  });

  it("sorts by booking_datetime descending", async () => {
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([]);
    await getConsultationsPaginated({ sort: { column: "booking_datetime", direction: "desc" } });
    expect(prisma.consultation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ booking_datetime: "desc" }, { id: "asc" }] }),
    );
  });

  it("sorts by status ascending", async () => {
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([]);
    await getConsultationsPaginated({ sort: { column: "status", direction: "asc" } });
    expect(prisma.consultation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ status: "asc" }, { id: "asc" }] }),
    );
  });

  it("falls back to default orderBy for unknown sort column", async () => {
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([]);
    await getConsultationsPaginated({ sort: { column: "unknown", direction: "asc" } });
    expect(prisma.consultation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { booking_datetime: "desc" } }),
    );
  });
});

describe("getConsultationOverviewById", () => {
  const mockFullConsultation = (overrides: Record<string, unknown> = {}) => ({
    id: "1",
    concern: "Legal advice",
    booking_datetime: new Date("2024-06-01T10:00:00"),
    status: "Scheduled" as const,
    client_id: "c1",
    created_by_user_id: "u1",
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    reminder_days: null,
    last_reminded_at: null,
    client: {
      id: "c1",
      name: "Jane Client",
      phone_number: "09170000001",
      email: "jane@email.com",
      address: "123 Rizal St.",
      created_at: new Date("2024-01-01"),
      updated_at: new Date("2024-06-01"),
    },
    createdBy: { name: "John Lawyer" },
    consultationAssignments: [
      { user: { id: "u1", name: "John Lawyer" } },
      { user: { id: "u2", name: "Alice Paralegal" } },
    ],
    cases: [{ id: "case1", case_title: "Jane vs Corp" }],
    ...overrides,
  });

  it("returns mapped overview data", async () => {
    const data = mockFullConsultation();
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(data);

    const result = await getConsultationOverviewById("1");

    expect(result).toEqual({
      id: "1",
      concern: "Legal advice",
      booking_datetime: data.booking_datetime,
      status: "Scheduled",
      created_at: data.created_at,
      updated_at: data.updated_at,
      client: {
        name: "Jane Client",
        phone_number: "09170000001",
        email: "jane@email.com",
        address: "123 Rizal St.",
      },
      createdBy: { name: "John Lawyer" },
      assignTo: [
        { id: "u1", name: "John Lawyer" },
        { id: "u2", name: "Alice Paralegal" },
      ],
      relatedCase: { id: "case1", case_title: "Jane vs Corp" },
    });
    expect(prisma.consultation.findUnique).toHaveBeenCalledWith({
      where: { id: "1" },
      include: {
        client: true,
        createdBy: { select: { name: true } },
        consultationAssignments: {
          where: { user: { is_active: true } },
          include: { user: { select: { id: true, name: true } } },
          orderBy: [{ created_at: "asc" }, { user: { name: "asc" } }, { user_id: "asc" }],
        },
        cases: { select: { id: true, case_title: true }, take: 1 },
      },
    });
  });

  it("handles consultation with no related case", async () => {
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(
      mockFullConsultation({ cases: [] }),
    );

    const result = await getConsultationOverviewById("1");

    expect(result.relatedCase).toBeNull();
  });

  it("calls notFound when consultation does not exist", async () => {
    const { notFound } = await import("next/navigation");
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(null);
    const notFoundMock = vi.mocked(notFound);
    notFoundMock.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(getConsultationOverviewById("999")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledOnce();
  });
});

describe("getConsultationNotesPaginated", () => {
  const mockNote = (overrides: Record<string, unknown> = {}) => ({
    id: "n1",
    content: "Client discussed settlement options",
    case_id: null,
    consultation_id: "1",
    task_id: null,
    created_by_user_id: "u1",
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    createdBy: { name: "John Lawyer" },
    ...overrides,
  });

  it("returns mapped note rows", async () => {
    const notes = [
      mockNote(),
      mockNote({
        id: "n2",
        content: "Follow-up call scheduled",
        createdBy: { name: "Alice Paralegal" },
      }),
    ];
    vi.mocked(prisma.note.findMany).mockResolvedValue(notes);

    const result = await getConsultationNotesPaginated({ consultationId: "1", pageSize: 10 });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "n1",
      content: "Client discussed settlement options",
      author: "John Lawyer",
      created_at: notes[0].created_at,
    });
  });

  it("filters by search term", async () => {
    vi.mocked(prisma.note.findMany).mockResolvedValue([mockNote()]);

    await getConsultationNotesPaginated({ consultationId: "1", search: "settlement" });

    expect(prisma.note.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { consultation_id: "1", content: { contains: "settlement", mode: "insensitive" } },
      }),
    );
  });

  it("handles cursor pagination", async () => {
    const notes = Array.from({ length: 4 }, (_, i) => mockNote({ id: String(i + 1) }));
    vi.mocked(prisma.note.findMany).mockResolvedValue(notes);

    const result = await getConsultationNotesPaginated({ consultationId: "1", pageSize: 3 });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("returns empty when none exist", async () => {
    vi.mocked(prisma.note.findMany).mockResolvedValue([]);

    const result = await getConsultationNotesPaginated({ consultationId: "1" });

    expect(result.rows).toEqual([]);
  });
});

describe("getEntityActivityLogPaginated (Consultation)", () => {
  beforeEach(() => {
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([]);
  });

  const mockLog = (overrides: Record<string, unknown> = {}) => ({
    id: "l1",
    action: "CREATE",
    actor_user_id: "u1",
    entity_type: "Consultation",
    entity_id: "1",
    details: "Consultation created",
    created_at: new Date("2024-06-01"),
    actor: { name: "John Lawyer" },
    ...overrides,
  });

  it("returns mapped activity log rows", async () => {
    const logs = [
      mockLog(),
      mockLog({
        id: "l2",
        action: "UPDATE",
        details: "Status changed to Accepted",
        actor: { name: "Alice Paralegal" },
      }),
    ];
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue(logs);
    vi.mocked(prisma.consultation.findMany).mockResolvedValue([]);

    const result = await getEntityActivityLogPaginated({
      entityType: "Consultation",
      entityId: "1",
      pageSize: 10,
    });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "l1",
      action: "CREATE",
      actor: "John Lawyer",
      entityType: "Consultation",
      entityId: "1",
      entityExists: false,
      details: "Consultation created",
      created_at: logs[0].created_at,
    });
  });

  it("filters by entity type and id", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([mockLog()]);

    await getEntityActivityLogPaginated({ entityType: "Consultation", entityId: "1" });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entity_type: "Consultation", entity_id: "1" },
      }),
    );
  });

  it("filters by search on action and details", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([mockLog()]);

    await getEntityActivityLogPaginated({
      entityType: "Consultation",
      entityId: "1",
      search: "created",
    });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          entity_type: "Consultation",
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
      entityType: "Consultation",
      entityId: "1",
      pageSize: 3,
    });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("returns empty when no logs", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

    const result = await getEntityActivityLogPaginated({
      entityType: "Consultation",
      entityId: "1",
    });

    expect(result.rows).toEqual([]);
  });
});

describe("getConsultationEditData", () => {
  const consultationEditRecord = {
    id: "1",
    client_id: "c1",
    concern: "Legal advice",
    booking_datetime: new Date("2024-06-01T10:00:00"),
    status: "Scheduled" as const,
    created_by_user_id: "u1",
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    reminder_days: null,
    last_reminded_at: null,
    consultationAssignments: [{ user_id: "u1" }],
  };

  it("returns the mapped consultation edit data", async () => {
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(consultationEditRecord);

    const result = await getConsultationEditData("1");

    expect(result).toMatchObject({
      id: "1",
      client_id: "c1",
      concern: "Legal advice",
      status: "Scheduled",
      assignee_ids: ["u1"],
    });
    expect(prisma.consultation.findUnique).toHaveBeenCalledWith({
      where: { id: "1" },
      select: {
        id: true,
        client_id: true,
        concern: true,
        booking_datetime: true,
        status: true,
        reminder_days: true,
        consultationAssignments: {
          select: { user_id: true },
        },
      },
    });
  });

  it("includes assignee ids of inactive users", async () => {
    const record = {
      ...consultationEditRecord,
      consultationAssignments: [{ user_id: "u1" }, { user_id: "u9" }],
    };
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(record);

    const result = await getConsultationEditData("1");

    expect(result).toMatchObject({ assignee_ids: ["u1", "u9"] });
  });

  it("returns null when the consultation is not found", async () => {
    vi.mocked(prisma.consultation.findUnique).mockResolvedValue(null);

    const result = await getConsultationEditData("1");

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.consultation.findUnique).mockRejectedValue(error);

    await expect(getConsultationEditData("1")).rejects.toThrow(error);
  });
});

describe("getConsultationAssigneeIds", () => {
  const assignment = (user_id: string) => ({
    id: `a-${user_id}`,
    consultation_id: "1",
    user_id,
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
  });

  it("returns the user ids of active assignees", async () => {
    vi.mocked(prisma.consultationAssignment.findMany).mockResolvedValue([
      assignment("u1"),
      assignment("u2"),
    ]);

    const result = await getConsultationAssigneeIds("1");

    expect(result).toEqual(["u1", "u2"]);
    expect(prisma.consultationAssignment.findMany).toHaveBeenCalledWith({
      where: { consultation_id: "1", user: { is_active: true } },
      select: { user_id: true },
    });
  });

  it("returns an empty array when there are no assignees", async () => {
    vi.mocked(prisma.consultationAssignment.findMany).mockResolvedValue([]);

    const result = await getConsultationAssigneeIds("1");

    expect(result).toEqual([]);
  });
});
