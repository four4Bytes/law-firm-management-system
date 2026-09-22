import {
  CaseMilestoneStatus,
  CaseStatus,
  ConsultationStatus,
  NotificationType,
  PaymentStatus,
  Prisma,
  ReviewDecision,
  Role,
  TaskAssignmentStatus,
  TaskStatus,
  type AuditLog,
  type Case,
  type CaseAssignment,
  type CaseMilestone,
  type Client,
  type Consultation,
  type ConsultationAssignment,
  type Document,
  type Note,
  type Notification,
  type Payment,
  type Task,
  type TaskAssignment,
  type TaskReviewer,
  type User,
} from "@/generated/prisma/browser";
import type { AuthenticatedUser } from "@/lib/security/auth-guards";

export function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: "1",
    name: "Test User",
    email: "a@b.com",
    google_sub: null,
    role: Role.Dev,
    is_active: true,
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-01"),
    last_seen_at: null,
    emailVerified: null,
    image: null,
    ...overrides,
  };
}

export function mockSessionUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "admin-id",
    email: "admin@law.com",
    role: Role.Admin,
    name: "Admin",
    ...overrides,
  };
}

export function mockClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "c1",
    name: "Alice Client",
    address: null,
    email: "alice.client@email.com",
    phone_number: "09170000000",
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-01"),
    ...overrides,
  };
}

export function mockCase(overrides: Partial<Case> = {}): Case {
  return {
    id: "1",
    client_id: "c1",
    source_consultation_id: null,
    case_title: "Smith vs Jones",
    case_type: "Civil",
    parties_involved: null,
    status: CaseStatus.Open,
    created_by_user_id: "u1",
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    ...overrides,
  };
}

export function mockCaseAssignment(overrides: Partial<CaseAssignment> = {}): CaseAssignment {
  return {
    id: "ca1",
    case_id: "1",
    user_id: "u1",
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    ...overrides,
  };
}

export function mockConsultation(overrides: Partial<Consultation> = {}): Consultation {
  return {
    id: "con1",
    client_id: "c1",
    created_by_user_id: "u1",
    booking_datetime: new Date("2024-06-15T09:00:00"),
    concern: "Test concern",
    status: ConsultationStatus.Scheduled,
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    last_reminded_at: null,
    ...overrides,
  };
}

export function mockConsultationAssignment(
  overrides: Partial<ConsultationAssignment> = {},
): ConsultationAssignment {
  return {
    id: "cona1",
    consultation_id: "con1",
    user_id: "u1",
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    ...overrides,
  };
}

export function mockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    case_id: "c1",
    title: "Task title",
    description: null,
    status: TaskStatus.Pending,
    created_by_user_id: "u1",
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    ...overrides,
  };
}

export function mockTaskAssignment(overrides: Partial<TaskAssignment> = {}): TaskAssignment {
  return {
    id: "ta1",
    task_id: "t1",
    user_id: "u1",
    status: TaskAssignmentStatus.Todo,
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    ...overrides,
  };
}

export function mockTaskReviewer(overrides: Partial<TaskReviewer> = {}): TaskReviewer {
  return {
    id: "tr1",
    task_id: "t1",
    reviewer_user_id: "u2",
    decision: ReviewDecision.Pending,
    reviewed_at: null,
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    ...overrides,
  };
}

export function mockMilestone(overrides: Partial<CaseMilestone> = {}): CaseMilestone {
  return {
    id: "m1",
    case_id: "c1",
    title: "Milestone title",
    description: null,
    due_date: new Date("2024-07-01"),
    status: CaseMilestoneStatus.Pending,
    created_by_user_id: "u1",
    created_at: new Date("2024-06-01"),
    updated_at: new Date("2024-06-01"),
    last_reminded_at: null,
    ...overrides,
  };
}

export function mockPayment(
  overrides: Partial<Omit<Payment, "amount">> & { amount?: number } = {},
): Payment {
  const { amount = 50000, ...rest } = overrides;
  return {
    id: "p1",
    amount: new Prisma.Decimal(amount),
    payment_date: new Date("2024-06-10"),
    status: PaymentStatus.Paid,
    payment_method: "Cash",
    receipt_number: "RC-2024-001",
    case_id: "1",
    consultation_id: null,
    created_by_user_id: "u1",
    created_at: new Date("2024-06-10"),
    updated_at: new Date("2024-06-10"),
    ...rest,
  };
}

export function mockNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    content: "Test note",
    case_id: "1",
    consultation_id: null,
    task_id: null,
    created_by_user_id: "u1",
    created_at: new Date("2024-06-05"),
    updated_at: new Date("2024-06-05"),
    ...overrides,
  };
}

export function mockDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: "d1",
    file_name: "test-document.pdf",
    file_path: "cases/1/test-document.pdf",
    file_type: "application/pdf",
    file_size: 1024,
    case_id: "1",
    consultation_id: null,
    task_id: null,
    uploaded_by_user_id: "u1",
    created_at: new Date("2024-06-05"),
    updated_at: new Date("2024-06-05"),
    ...overrides,
  };
}

export function mockNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notif1",
    user_id: "u1",
    type: NotificationType.TaskAssigned,
    title: "Task Assigned",
    message: "You were assigned to a task.",
    is_read: false,
    action_url: null,
    case_id: null,
    consultation_id: null,
    milestone_id: null,
    task_id: "t1",
    created_at: new Date("2024-06-05"),
    updated_at: new Date("2024-06-05"),
    ...overrides,
  };
}

export function mockAuditLog(overrides: Partial<AuditLog> = {}): AuditLog {
  return {
    id: "a1",
    actor_user_id: "u1",
    action: "case.created",
    entity_type: "Case",
    entity_id: "1",
    details: null,
    created_at: new Date("2024-06-05"),
    ...overrides,
  };
}
