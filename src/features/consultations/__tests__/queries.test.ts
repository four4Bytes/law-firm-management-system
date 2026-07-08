import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import {
  getConsultationActivityLogPaginated,
  getConsultationNotesPaginated,
  getConsultationOverviewById,
  getConsultationPaymentsPaginated,
  getConsultationsPaginated,
} from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { findMany: vi.fn() },
    consultation: { findMany: vi.fn(), findUniqueOrThrow: vi.fn() },
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
    cases: [{ id: "case1", case_title: "Jane vs Corp" }],
    ...overrides,
  });

  it("returns mapped overview data", async () => {
    const data = mockFullConsultation();
    vi.mocked(prisma.consultation.findUniqueOrThrow).mockResolvedValue(data);

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
      relatedCase: { id: "case1", case_title: "Jane vs Corp" },
    });
    expect(prisma.consultation.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: "1" },
      include: {
        client: true,
        createdBy: { select: { name: true } },
        cases: { select: { id: true, case_title: true }, take: 1 },
      },
    });
  });

  it("handles consultation with no related case", async () => {
    vi.mocked(prisma.consultation.findUniqueOrThrow).mockResolvedValue(
      mockFullConsultation({ cases: [] }),
    );

    const result = await getConsultationOverviewById("1");

    expect(result.relatedCase).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("not found");
    vi.mocked(prisma.consultation.findUniqueOrThrow).mockRejectedValue(error);

    await expect(getConsultationOverviewById("999")).rejects.toThrow(error);
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

describe("getConsultationPaymentsPaginated", () => {
  const mockPayment = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: "p1",
    amount: 1500,
    payment_date: new Date("2024-06-15"),
    status: "Paid",
    payment_method: "GCash",
    receipt_number: "RC-2024-001",
    case_id: null,
    consultation_id: "1",
    created_by_user_id: "u1",
    created_at: new Date("2024-06-15"),
    updated_at: new Date("2024-06-15"),
    ...overrides,
  });

  it("returns mapped payment rows", async () => {
    const payments = [mockPayment(), mockPayment({ id: "p2", amount: 2500, status: "Partial" })];
    vi.mocked(prisma.payment.findMany).mockResolvedValue(payments as never[]);

    const result = await getConsultationPaymentsPaginated({ consultationId: "1", pageSize: 10 });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "p1",
      amount: 1500,
      payment_date: payments[0].payment_date,
      payment_method: "GCash",
      receipt_number: "RC-2024-001",
      status: "Paid",
    });
  });

  it("filters by search on method, status, or receipt", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([mockPayment()] as never[]);

    await getConsultationPaymentsPaginated({ consultationId: "1", search: "GCash" });

    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          consultation_id: "1",
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

    const result = await getConsultationPaymentsPaginated({ consultationId: "1", pageSize: 3 });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("returns empty when none exist", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);

    const result = await getConsultationPaymentsPaginated({ consultationId: "1" });

    expect(result.rows).toEqual([]);
  });

  it("sorts by amount ascending", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
    await getConsultationPaymentsPaginated({
      consultationId: "1",
      sort: { column: "amount", direction: "asc" },
    });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ amount: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by amount descending", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
    await getConsultationPaymentsPaginated({
      consultationId: "1",
      sort: { column: "amount", direction: "desc" },
    });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ amount: "desc" }, { id: "asc" }] }),
    );
  });

  it("sorts by payment_date ascending", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
    await getConsultationPaymentsPaginated({
      consultationId: "1",
      sort: { column: "payment_date", direction: "asc" },
    });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ payment_date: "asc" }, { id: "asc" }] }),
    );
  });

  it("sorts by status descending", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
    await getConsultationPaymentsPaginated({
      consultationId: "1",
      sort: { column: "status", direction: "desc" },
    });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ status: "desc" }, { id: "asc" }] }),
    );
  });

  it("falls back to default orderBy for unknown sort column", async () => {
    vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
    await getConsultationPaymentsPaginated({
      consultationId: "1",
      sort: { column: "unknown", direction: "asc" },
    });
    expect(prisma.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { payment_date: "desc" } }),
    );
  });
});

describe("getConsultationActivityLogPaginated", () => {
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

    const result = await getConsultationActivityLogPaginated({ consultationId: "1", pageSize: 10 });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      id: "l1",
      action: "CREATE",
      actor: "John Lawyer",
      details: "Consultation created",
      created_at: logs[0].created_at,
    });
  });

  it("filters by entity type and id", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([mockLog()]);

    await getConsultationActivityLogPaginated({ consultationId: "1" });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entity_type: "Consultation", entity_id: "1" },
      }),
    );
  });

  it("filters by search on action and details", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([mockLog()]);

    await getConsultationActivityLogPaginated({ consultationId: "1", search: "created" });

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

    const result = await getConsultationActivityLogPaginated({ consultationId: "1", pageSize: 3 });

    expect(result.rows).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("returns empty when no logs", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

    const result = await getConsultationActivityLogPaginated({ consultationId: "1" });

    expect(result.rows).toEqual([]);
  });
});
