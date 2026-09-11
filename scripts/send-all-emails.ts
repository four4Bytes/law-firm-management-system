/**
 * Sends one email per NotificationType to a single debug recipient via SMTP.
 *
 * Bypasses all business logic (assignment, preferences, scheduling, active
 * checks) and renders each template directly so you can inspect every design
 * in Mailpit (http://localhost:8025) without waiting for timed triggers.
 *
 * Env (all via dotenv/config):
 * - EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM, EMAIL_SECURE (required for SMTP)
 * - APP_ORIGIN (required for /case/... and /consultation/... links)
 * - DEBUG_EMAIL (optional) — recipient for all debug sends; falls back to EMAIL_FROM address
 * - APP_TIMEZONE (optional) — defaults to Asia/Manila for PH; only affects formatted dates in subjects if you customize them
 *
 * Usage:
 *   pnpm exec tsx scripts/send-all-emails.ts
 *   DEBUG_EMAIL=you@example.com pnpm exec tsx scripts/send-all-emails.ts
 *   APP_ORIGIN=http://localhost:3000 DEBUG_EMAIL=test@localhost pnpm exec tsx scripts/send-all-emails.ts
 */
import "dotenv/config";

import { NotificationType } from "@/generated/prisma/browser";
import { sendEmail, verifyEmailConnection } from "@/lib/email";
import {
  caseAssignedTemplate,
  consultationAssignedTemplate,
  consultationOverdueTemplate,
  consultationReminderTemplate,
  milestoneTemplate,
  statusChangeTemplate,
  taskAssignedTemplate,
  type TemplateContext,
} from "@/lib/email-templates";
import { getRequiredEnvVar } from "@/lib/env";

const DEBUG_EMAIL_ENV = "DEBUG_EMAIL";

function getDebugRecipient(): string {
  const explicit = process.env[DEBUG_EMAIL_ENV]?.trim();
  if (explicit) return explicit;

  const from = getRequiredEnvVar("EMAIL_FROM");
  const match = from.match(/<([^>]+)>/);
  if (match?.[1]) return match[1].trim();
  if (from.includes("@")) return from.trim();

  console.error(
    `[${DEBUG_EMAIL_ENV}] is not set and EMAIL_FROM ("${from}") has no parseable address. Set DEBUG_EMAIL.`,
  );
  process.exit(1);
}

function pickTemplate(type: NotificationType) {
  switch (type) {
    case NotificationType.ConsultationReminder:
      return consultationReminderTemplate;
    case NotificationType.ConsultationOverdue:
      return consultationOverdueTemplate;
    case NotificationType.MilestoneDueSoon:
    case NotificationType.MilestoneOverdue:
      return milestoneTemplate;
    case NotificationType.TaskAssigned:
      return taskAssignedTemplate;
    case NotificationType.CaseAssigned:
      return caseAssignedTemplate;
    case NotificationType.MilestoneStatusChanged:
    case NotificationType.TaskStatusChanged:
    case NotificationType.CaseStatusChanged:
    case NotificationType.ConsultationStatusChanged:
      return statusChangeTemplate;
    case NotificationType.ConsultationAssigned:
      return consultationAssignedTemplate;
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unhandled notification type: ${String(_exhaustive)}`);
    }
  }
}

function fakeContext(type: NotificationType): { subject: string; ctx: TemplateContext } {
  // Real-looking PH firm data mirrored from prisma/seed/* so Mailpit previews read like prod
  const toName = "Maya Fernandez";
  const actorName = "Atty. Sofia Villanueva";

  switch (type) {
    case NotificationType.ConsultationReminder:
      return {
        subject: "Upcoming Consultation Reminder — Alvarez Estate Planning",
        ctx: {
          toName,
          actorName: "Atty. Kevin Garcia",
          title: "Upcoming Consultation Reminder",
          message:
            'A consultation about "Estate planning — preparation of last will and testament for blended family" is upcoming — scheduled for Sep 14, 2026 at 3:30 PM',
          actionUrl: "/consultation/debug-consultation-id",
        },
      };
    case NotificationType.ConsultationOverdue:
      return {
        subject: "Overdue Consultation — Reyes Property Tax Reassessment",
        ctx: {
          toName,
          actorName: "Atty. Paolo Guerrero",
          title: "Overdue Consultation",
          message:
            'A consultation about "Property tax reassessment — assessed value doubled, seeking legal remedy" is overdue — scheduled for Sep 10, 2026 at 9:00 AM',
          actionUrl: "/consultation/debug-consultation-id",
        },
      };
    case NotificationType.ConsultationAssigned:
      return {
        subject: "Consultation Assigned — Dela Cruz Property Title Transfer",
        ctx: {
          toName: "Atty. Marco Lopez",
          actorName,
          title:
            "Consultation assigned: Dela Cruz Property Title Transfer — Nuvali lot encroachment",
          message:
            'You have been assigned to consultation: "Boundary dispute with neighboring property owner — encroachment on northern lot boundary (Dela Cruz, Nuvali)"',
          actionUrl: "/consultation/debug-consultation-id",
        },
      };
    case NotificationType.MilestoneDueSoon:
      return {
        subject: "Milestone Due Soon — Dela Cruz Property Title Transfer",
        ctx: {
          toName: "Atty. David Tan",
          actorName: "Atty. Catherine Diaz",
          title: "Milestone due soon: Due Diligence Completed",
          message:
            'Milestone "Due Diligence Completed for Ramirez Corp Series A" is due soon — due Sep 14, 2026',
          actionUrl: "/case/debug-case-id",
        },
      };
    case NotificationType.MilestoneOverdue:
      return {
        subject: "Milestone Overdue — Reyes vs. San Miguel Logistics",
        ctx: {
          toName: "Atty. Jessica Lim",
          actorName: "Atty. Miguel Cruz",
          title: "Milestone overdue: Serve summons",
          message:
            'Milestone "Serve Summons & File Return — Reyes vs. San Miguel Logistics (Civil Litigation)" is overdue — due Sep 10, 2026',
          actionUrl: "/case/debug-case-id",
        },
      };
    case NotificationType.TaskAssigned:
      return {
        subject: "Task Assigned — Reyes vs. San Miguel Logistics",
        ctx: {
          toName: "Atty. Paolo Guerrero",
          actorName: "Atty. Marco Lopez",
          title: "Task assigned: Draft complaint — Reyes vs. San Miguel Logistics",
          message:
            'You have been assigned to task: "Draft complaint and annexes for Reyes vs. San Miguel Logistics (Breach of contract — 6-month supply agreement)"',
          actionUrl: "/case/debug-case-id",
        },
      };
    case NotificationType.CaseAssigned:
      return {
        subject: "Case Assigned — Ramirez Corp Series A",
        ctx: {
          toName: "Atty. Maya Fernandez",
          actorName: "Atty. Angela Mercado",
          title: "Case assigned: Ramirez Corp — Series A Funding",
          message:
            'You have been assigned to case: "Ramirez Corp — Series A Funding (Corporate) — Sofia D. Ramirez, founder, Venture Capital Fund" — parties: Sofia D. Ramirez (Founder, Ramirez Tech Inc.), Venture Capital Fund',
          actionUrl: "/case/debug-case-id",
        },
      };
    case NotificationType.ConsultationStatusChanged:
      return {
        subject: "Consultation Status: Scheduled → Accepted — Gonzales Legal Separation",
        ctx: {
          toName,
          actorName,
          title: "Consultation status changed: Gonzales Legal Separation",
          message:
            'Consultation "Legal separation — married 12 years, husband abandoned the family, seeking custody and support (Maria Gonzales)" status changed from Scheduled to Accepted',
          actionUrl: "/consultation/debug-consultation-id",
        },
      };
    case NotificationType.CaseStatusChanged:
      return {
        subject: "Case Status: Open → Closed — Navarro Estate Joint Venture",
        ctx: {
          toName: "Atty. David Tan",
          actorName: "Atty. Catherine Diaz",
          title: "Case status changed: Navarro Estate Development Joint Venture",
          message:
            'Case "Navarro Estate Development Joint Venture (Real Estate) — Miguel B. Navarro / Kingsbridge Capital HK Ltd." status changed from Open to Closed',
          actionUrl: "/case/debug-case-id",
        },
      };
    case NotificationType.TaskStatusChanged:
      return {
        subject: "Task Status: Submitted → Completed — Draft Complaint",
        ctx: {
          toName: "Atty. Kevin Garcia",
          actorName: "Atty. Nina Salvador",
          title: "Task status changed: Draft complaint — Reyes vs. San Miguel",
          message:
            'Task "Draft complaint and annexes — Reyes vs. San Miguel Logistics" status changed from Submitted to Completed',
          actionUrl: "/case/debug-case-id",
        },
      };
    case NotificationType.MilestoneStatusChanged:
      return {
        subject: "Milestone Status: Pending → Done — Due Diligence",
        ctx: {
          toName: "Atty. Angela Mercado",
          actorName: "Atty. Maya Fernandez",
          title: "Milestone status changed: Due Diligence Completed",
          message:
            'Milestone "Psychological Evaluation Completed — Alcantara Annulment Proceedings (Family Law)" status changed from Pending to Done',
          actionUrl: "/case/debug-case-id",
        },
      };
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unhandled type: ${String(_exhaustive)}`);
    }
  }
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    console.error("[send-all-emails] refusing to run in production (NODE_ENV=production)");
    process.exit(1);
  }

  const to = getDebugRecipient();
  const appOrigin = getRequiredEnvVar("APP_ORIGIN");

  console.log(`[send-all-emails] recipient=${to} origin=${appOrigin}`);

  const canConnect = await verifyEmailConnection();
  if (!canConnect) {
    console.error(
      "[send-all-emails] SMTP verify failed — check EMAIL_* env and Mailpit (http://localhost:8025)",
    );
    process.exit(1);
  }

  const types = Object.values(NotificationType) as NotificationType[];
  console.log(`[send-all-emails] sending ${types.length} templates...`);

  for (const type of types) {
    const { subject, ctx } = fakeContext(type);
    const html = pickTemplate(type)(ctx);
    try {
      await sendEmail({ to, subject, html });
      console.log(`[send-all-emails] ✓ ${type} → ${to} (${subject})`);
    } catch (err) {
      console.error(`[send-all-emails] ✗ ${type} failed:`, err);
    }
  }

  console.log(`[send-all-emails] done — check Mailpit at http://localhost:8025`);
}

main().catch((err) => {
  console.error("[send-all-emails] unhandled error:", err);
  process.exit(1);
});
