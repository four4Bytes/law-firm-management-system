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
  // ── ConsultationCreated ──
  {
    userEmail: "miguel.cruz@aninolaw.com",
    type: NotificationType.ConsultationCreated,
    title: "Consultation booked: Trademark registration",
    message:
      "A new consultation has been created for Kristine Aguilar regarding trademark registration.",
    is_read: true,
    daysAgo: 7,
    consultationClientEmail: "kristine.aguilar@email.com",
  },
  {
    userEmail: "catherine.diaz@aninolaw.com",
    type: NotificationType.ConsultationCreated,
    title: "Consultation booked: Contract review",
    message:
      "A new consultation has been created for Jose Mercado regarding software development contract review.",
    is_read: false,
    daysAgo: 1,
    consultationClientEmail: "jose.mercado@email.com",
  },
  {
    userEmail: "robert.santos@aninolaw.com",
    type: NotificationType.ConsultationCreated,
    title: "Consultation booked: Child custody modification",
    message:
      "A new consultation has been created for Diana Navarro regarding child custody modification.",
    is_read: false,
    daysAgo: 10,
    consultationClientEmail: "diana.navarro@email.com",
  },
  // ── ConsultationUpdated ──
  {
    userEmail: "jessica.lim@aninolaw.com",
    type: NotificationType.ConsultationUpdated,
    title: "Consultation rescheduled: Boundary dispute",
    message:
      "Antonio Lopez's consultation has been rescheduled to 3 days from now due to the client's availability.",
    is_read: true,
    daysAgo: 5,
    consultationClientEmail: "antonio.lopez@email.com",
  },
  {
    userEmail: "kevin.garcia@aninolaw.com",
    type: NotificationType.ConsultationUpdated,
    title: "Consultation updated: Medical malpractice",
    message:
      "Patricia Luna's consultation details have been updated — client added new medical records.",
    is_read: false,
    daysAgo: 1,
    consultationClientEmail: "patricia.luna@email.com",
  },
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
  {
    userEmail: "catherine.diaz@aninolaw.com",
    type: NotificationType.ConsultationReminder,
    title: "Upcoming consultation reminder: Land title transfer",
    message: "Luisito Ramos's consultation about land title verification is scheduled in 14 days.",
    is_read: false,
    daysAgo: 1,
    consultationClientEmail: "luisito.ramos@email.com",
  },
  // ── MilestoneDueSoon ──
  {
    userEmail: "david.tan@aninolaw.com",
    type: NotificationType.MilestoneDueSoon,
    title: "Milestone due soon: Title Verification Complete",
    message:
      'Milestone "Title Verification Complete" for Dela Cruz Property Title Transfer is due in 7 days.',
    is_read: false,
    daysAgo: 1,
    caseTitle: "Dela Cruz Property Title Transfer",
    milestoneTitle: "Title Verification Complete",
  },
  {
    userEmail: "catherine.diaz@aninolaw.com",
    type: NotificationType.MilestoneDueSoon,
    title: "Milestone due soon: Title Verification Complete",
    message:
      'Milestone "Title Verification Complete" for Dela Cruz Property Title Transfer is due in 7 days.',
    is_read: false,
    daysAgo: 1,
    caseTitle: "Dela Cruz Property Title Transfer",
    milestoneTitle: "Title Verification Complete",
  },
  {
    userEmail: "miguel.cruz@aninolaw.com",
    type: NotificationType.MilestoneDueSoon,
    title: "Milestone due soon: Pre-Trial Conference",
    message:
      'Milestone "Pre-Trial Conference" for Reyes vs. San Miguel Logistics is due in 21 days.',
    is_read: false,
    daysAgo: 2,
    caseTitle: "Reyes vs. San Miguel Logistics",
    milestoneTitle: "Pre-Trial Conference",
  },
  // ── MilestoneCompleted ──
  {
    userEmail: "miguel.cruz@aninolaw.com",
    type: NotificationType.MilestoneCompleted,
    title: "Milestone completed: Complaint Filed with RTC",
    message:
      'Milestone "Complaint Filed with RTC" for Reyes vs. San Miguel Logistics has been completed.',
    is_read: true,
    daysAgo: 2,
    caseTitle: "Reyes vs. San Miguel Logistics",
    milestoneTitle: "Complaint Filed with RTC",
  },
  {
    userEmail: "jessica.lim@aninolaw.com",
    type: NotificationType.MilestoneCompleted,
    title: "Milestone completed: Complaint Filed with RTC",
    message:
      'Milestone "Complaint Filed with RTC" for Reyes vs. San Miguel Logistics has been completed.',
    is_read: true,
    daysAgo: 2,
    caseTitle: "Reyes vs. San Miguel Logistics",
    milestoneTitle: "Complaint Filed with RTC",
  },
  {
    userEmail: "gina.reyes@aninolaw.com",
    type: NotificationType.MilestoneCompleted,
    title: "Milestone completed: Tax Reduction Approved",
    message:
      'Milestone "Tax Reduction Approved by LBAA" for Hernandez Property Tax Protest has been completed.',
    is_read: false,
    daysAgo: 0,
    caseTitle: "Hernandez Property Tax Protest",
    milestoneTitle: "Tax Reduction Approved by LBAA",
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
  // ── MilestoneUpdated ──
  {
    userEmail: "marco.lopez@aninolaw.com",
    type: NotificationType.MilestoneUpdated,
    title: "Milestone updated: Loan Restructuring Negotiation Deadline",
    message:
      'Milestone "Loan Restructuring Negotiation Deadline" for Santos Foreclosure Defense has been updated — deadline extended by 3 days.',
    is_read: true,
    daysAgo: 3,
    caseTitle: "Santos Foreclosure Defense",
    milestoneTitle: "Loan Restructuring Negotiation Deadline",
  },
  {
    userEmail: "angela.mercado@aninolaw.com",
    type: NotificationType.MilestoneUpdated,
    title: "Milestone updated: Due Diligence Document Submission",
    message:
      'Milestone "Due Diligence Document Submission" for Ramirez Corp — Series A Funding — additional documents requested by investor.',
    is_read: false,
    daysAgo: 1,
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
  // ── TaskStatusChanged ──
  {
    userEmail: "jessica.lim@aninolaw.com",
    type: NotificationType.TaskStatusChanged,
    title: "Task submitted: Coordinate Tax Payment with BIR",
    message:
      'Task "Coordinate Tax Payment with BIR" has been submitted for review for Dela Cruz Property Title Transfer.',
    is_read: true,
    daysAgo: 2,
    caseTitle: "Dela Cruz Property Title Transfer",
    taskTitle: "Coordinate Tax Payment with BIR",
  },
  {
    userEmail: "david.tan@aninolaw.com",
    type: NotificationType.TaskStatusChanged,
    title: "Task submitted for your review: Coordinate Tax Payment with BIR",
    message:
      'Task "Coordinate Tax Payment with BIR" has been submitted for your review for Dela Cruz Property Title Transfer.',
    is_read: true,
    daysAgo: 2,
    caseTitle: "Dela Cruz Property Title Transfer",
    taskTitle: "Coordinate Tax Payment with BIR",
  },
  {
    userEmail: "kevin.garcia@aninolaw.com",
    type: NotificationType.TaskStatusChanged,
    title: "Task rejected: Revise Petition per Supervising Counsel Comments",
    message:
      'Task "Revise Petition per Supervising Counsel Comments" was rejected — initial draft lacked specific factual basis for Alcantara Annulment Proceedings.',
    is_read: false,
    daysAgo: 4,
    caseTitle: "Alcantara Annulment Proceedings",
    taskTitle: "Revise Petition per Supervising Counsel Comments",
  },
  {
    userEmail: "marco.lopez@aninolaw.com",
    type: NotificationType.TaskStatusChanged,
    title: "Task status: File Reply to Bank's Opposition to TRO Application",
    message:
      'Task "File Reply to Bank\'s Opposition to TRO Application" is now Ongoing for Santos Foreclosure Defense.',
    is_read: false,
    daysAgo: 1,
    caseTitle: "Santos Foreclosure Defense",
    taskTitle: "File Reply to Bank's Opposition to TRO Application",
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
  // ── Extra ConsultationReminder for variety (daysAgo: 0 = today) ──
  {
    userEmail: "miguel.cruz@aninolaw.com",
    type: NotificationType.ConsultationReminder,
    title: "Consultation reminder: Trademark registration",
    message:
      "Reminder: Kristine Aguilar's trademark consultation is scheduled in 7 days. Prepare the trademark application checklist.",
    is_read: false,
    daysAgo: 0,
    consultationClientEmail: "kristine.aguilar@email.com",
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
