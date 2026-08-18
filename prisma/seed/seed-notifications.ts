import { NotificationType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

interface NotificationSeed {
  userEmail: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  daysAgo: number;
  caseTitle?: string;
  consultationClientEmail?: string;
  taskTitle?: string;
  milestoneTitle?: string;
}

const notificationSeeds: NotificationSeed[] = [
  // ── ConsultationReminder ──
  {
    userEmail: "jessica.lim@aninolaw.com",
    type: NotificationType.ConsultationReminder,
    title: "Upcoming consultation reminder: Boundary dispute",
    message: "Antonio Lopez's consultation about boundary dispute is scheduled in 3 days.",
    is_read: true,
    daysAgo: 3,
    consultationClientEmail: "antonio.lopez@email.com",
  },
  // ── MilestoneStatusChanged ──
  {
    userEmail: "marco.lopez@aninolaw.com",
    type: NotificationType.MilestoneStatusChanged,
    title: "Milestone cancelled: Barangay Mediation Attempt",
    message:
      'Milestone "Barangay Mediation Attempt" for Lopez Property Boundary Litigation was cancelled — no settlement reached, proceeding to court.',
    is_read: true,
    daysAgo: 7,
    caseTitle: "Lopez Property Boundary Litigation",
    milestoneTitle: "Barangay Mediation Attempt",
  },
  {
    userEmail: "miguel.cruz@aninolaw.com",
    type: NotificationType.MilestoneStatusChanged,
    title: "Milestone status: NLRC Decision on Illegal Dismissal",
    message:
      'Milestone "NLRC Decision on Illegal Dismissal" for Castillo Illegal Dismissal Complaint is pending with due date set.',
    is_read: false,
    daysAgo: 1,
    caseTitle: "Castillo Illegal Dismissal Complaint",
    milestoneTitle: "NLRC Decision on Illegal Dismissal",
  },
  // ── MilestoneOverdue ──
  {
    userEmail: "david.tan@aninolaw.com",
    type: NotificationType.MilestoneOverdue,
    title: "Milestone overdue: Tax Declaration Update from BIR",
    message:
      'Milestone "Tax Declaration Update from BIR" for Dela Cruz Property Title Transfer is overdue by 2 days.',
    is_read: false,
    daysAgo: 0,
    caseTitle: "Dela Cruz Property Title Transfer",
    milestoneTitle: "Tax Declaration Update from BIR",
  },
  {
    userEmail: "catherine.diaz@aninolaw.com",
    type: NotificationType.MilestoneOverdue,
    title: "Milestone overdue: Tax Declaration Update from BIR",
    message:
      'Milestone "Tax Declaration Update from BIR" for Dela Cruz Property Title Transfer is overdue by 2 days.',
    is_read: false,
    daysAgo: 0,
    caseTitle: "Dela Cruz Property Title Transfer",
    milestoneTitle: "Tax Declaration Update from BIR",
  },
  {
    userEmail: "angela.mercado@aninolaw.com",
    type: NotificationType.MilestoneOverdue,
    title: "Milestone overdue: Due Diligence Document Submission",
    message:
      'Milestone "Due Diligence Document Submission" for Ramirez Corp — Series A Funding is overdue by 1 day.',
    is_read: false,
    daysAgo: 0,
    caseTitle: "Ramirez Corp — Series A Funding",
    milestoneTitle: "Due Diligence Document Submission",
  },
  // ── TaskAssigned ──
  {
    userEmail: "jessica.lim@aninolaw.com",
    type: NotificationType.TaskAssigned,
    title: "Task assigned: Verify Property Title with Registry of Deeds",
    message:
      'You have been assigned to the task "Verify Property Title with Registry of Deeds" for Dela Cruz Property Title Transfer.',
    is_read: true,
    daysAgo: 25,
    caseTitle: "Dela Cruz Property Title Transfer",
    taskTitle: "Verify Property Title with Registry of Deeds",
  },
  {
    userEmail: "kevin.garcia@aninolaw.com",
    type: NotificationType.TaskAssigned,
    title: "Task assigned: Draft Petition for Legal Separation",
    message:
      'You have been assigned to the task "Draft Petition for Legal Separation" for Gonzales Legal Separation.',
    is_read: true,
    daysAgo: 20,
    caseTitle: "Gonzales Legal Separation",
    taskTitle: "Draft Petition for Legal Separation",
  },
  {
    userEmail: "nina.salvador@aninolaw.com",
    type: NotificationType.TaskAssigned,
    title: "Task assigned: Review Loan Documents for Predatory Clauses",
    message:
      'You have been assigned to the task "Review Loan Documents for Predatory Clauses" for Santos Foreclosure Defense.',
    is_read: false,
    daysAgo: 5,
    caseTitle: "Santos Foreclosure Defense",
    taskTitle: "Review Loan Documents for Predatory Clauses",
  },
  // ── CaseAssigned ──
  {
    userEmail: "david.tan@aninolaw.com",
    type: NotificationType.CaseAssigned,
    title: "Case assigned: Dela Cruz Property Title Transfer",
    message:
      'You have been assigned to the case "Dela Cruz Property Title Transfer" (Real Estate).',
    is_read: true,
    daysAgo: 28,
    caseTitle: "Dela Cruz Property Title Transfer",
  },
  {
    userEmail: "jessica.lim@aninolaw.com",
    type: NotificationType.CaseAssigned,
    title: "Case assigned: Dela Cruz Property Title Transfer",
    message:
      'You have been assigned to the case "Dela Cruz Property Title Transfer" (Real Estate).',
    is_read: true,
    daysAgo: 28,
    caseTitle: "Dela Cruz Property Title Transfer",
  },
  {
    userEmail: "sofia.villanueva@aninolaw.com",
    type: NotificationType.CaseAssigned,
    title: "Case assigned: Gonzales Legal Separation",
    message: 'You have been assigned to the case "Gonzales Legal Separation" (Family Law).',
    is_read: true,
    daysAgo: 23,
    caseTitle: "Gonzales Legal Separation",
  },
  {
    userEmail: "ricardo.guevarra@aninolaw.com",
    type: NotificationType.CaseAssigned,
    title: "Case assigned: Fernandez Criminal Defense",
    message:
      'You have been assigned to the case "Fernandez Criminal Defense — Estafa Case" (Criminal).',
    is_read: false,
    daysAgo: 12,
    caseTitle: "Fernandez Criminal Defense — Estafa Case",
  },
  {
    userEmail: "nina.salvador@aninolaw.com",
    type: NotificationType.CaseAssigned,
    title: "Case assigned: Fernandez Criminal Defense",
    message:
      'You have been assigned to the case "Fernandez Criminal Defense — Estafa Case" (Criminal).',
    is_read: false,
    daysAgo: 12,
    caseTitle: "Fernandez Criminal Defense — Estafa Case",
  },
];

export async function seedNotifications(
  userByEmail: Record<string, string>,
  clients: { id: string; email: string }[],
  cases: { id: string; title: string }[],
  tasks: { id: string; title: string }[],
): Promise<void> {
  const clientByEmail = Object.fromEntries(clients.map((c) => [c.email, c.id]));

  const caseByTitle = Object.fromEntries(cases.map((c) => [c.title, c.id]));

  const taskByTitle = Object.fromEntries(tasks.map((t) => [t.title, t.id]));

  const allCons = await prisma.consultation.findMany({
    select: { id: true, client_id: true },
  });
  const clientIdToConId: Record<string, string> = {};
  for (const c of allCons) {
    clientIdToConId[c.client_id] = c.id;
  }

  const allMilestones = await prisma.caseMilestone.findMany({
    select: { id: true, case_id: true, title: true },
  });
  const milestoneByTitleAndCase = new Map<string, string>();
  for (const m of allMilestones) {
    const key = `${m.case_id}::${m.title}`;
    milestoneByTitleAndCase.set(key, m.id);
  }

  let count = 0;
  for (const n of notificationSeeds) {
    const userId = userByEmail[n.userEmail];
    if (!userId) continue;

    const notifDate = new Date();
    notifDate.setDate(notifDate.getDate() - n.daysAgo);

    const data: Record<string, unknown> = {
      user_id: userId,
      type: n.type,
      title: n.title,
      message: n.message,
      is_read: n.is_read,
      created_at: notifDate,
    };

    if (n.caseTitle) {
      const caseId = caseByTitle[n.caseTitle];
      if (caseId) {
        data.case_id = caseId;

        if (n.milestoneTitle) {
          const key = `${caseId}::${n.milestoneTitle}`;
          const milestoneId = milestoneByTitleAndCase.get(key);
          if (milestoneId) {
            data.milestone_id = milestoneId;
          }
        }
      }
    }

    if (n.consultationClientEmail) {
      const clientId = clientByEmail[n.consultationClientEmail];
      if (clientId) {
        data.consultation_id = clientIdToConId[clientId];
      }
    }

    if (n.taskTitle) {
      const taskId = taskByTitle[n.taskTitle];
      if (taskId) {
        data.task_id = taskId;
      }
    }

    await prisma.notification.create({
      data: data as Parameters<typeof prisma.notification.create>[0]["data"],
    });
    count++;
  }

  console.log(`Seeded ${count} notifications.`);
}
