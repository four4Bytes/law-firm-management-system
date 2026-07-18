import { CaseMilestoneStatus, NotificationType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

interface MilestoneData {
  caseTitle: string;
  title: string;
  description: string;
  status: CaseMilestoneStatus;
  daysFromNow: number;
  createdByEmail: string;
  notifyEmails: string[];
}

const milestones: MilestoneData[] = [
  {
    caseTitle: "Dela Cruz Property Title Transfer",
    title: "Title Verification Complete",
    description: "Registry of Deeds confirms clean title with no encumbrances",
    status: "Pending",
    daysFromNow: 7,
    createdByEmail: "david.tan@aninolaw.com",
    notifyEmails: ["david.tan@aninolaw.com", "catherine.diaz@aninolaw.com"],
  },
  {
    caseTitle: "Dela Cruz Property Title Transfer",
    title: "Deed of Sale Signing",
    description: "Notarized signing of Deed of Absolute Sale between buyer and seller",
    status: "Pending",
    daysFromNow: 14,
    createdByEmail: "david.tan@aninolaw.com",
    notifyEmails: ["david.tan@aninolaw.com", "catherine.diaz@aninolaw.com"],
  },
  {
    caseTitle: "Gonzales Legal Separation",
    title: "Petition Filed with RTC",
    description: "Verified petition for legal separation filed and docketed with RTC Quezon City",
    status: "Pending",
    daysFromNow: 5,
    createdByEmail: "sofia.villanueva@aninolaw.com",
    notifyEmails: ["sofia.villanueva@aninolaw.com", "kevin.garcia@aninolaw.com"],
  },
  {
    caseTitle: "Gonzales Legal Separation",
    title: "Court Hearing",
    description: "First scheduled court hearing for legal separation case",
    status: "Pending",
    daysFromNow: 30,
    createdByEmail: "sofia.villanueva@aninolaw.com",
    notifyEmails: ["sofia.villanueva@aninolaw.com"],
  },
  {
    caseTitle: "Reyes vs. San Miguel Logistics",
    title: "Complaint Filed with RTC",
    description: "Verified complaint for breach of contract filed with RTC Makati",
    status: "Done",
    daysFromNow: -2,
    createdByEmail: "miguel.cruz@aninolaw.com",
    notifyEmails: ["miguel.cruz@aninolaw.com", "jessica.lim@aninolaw.com"],
  },
  {
    caseTitle: "Reyes vs. San Miguel Logistics",
    title: "Pre-Trial Conference",
    description: "Pre-trial conference scheduled before RTC Branch 56",
    status: "Pending",
    daysFromNow: 21,
    createdByEmail: "miguel.cruz@aninolaw.com",
    notifyEmails: ["miguel.cruz@aninolaw.com"],
  },
  {
    caseTitle: "Alcantara Annulment Proceedings",
    title: "Petition Filed with RTC",
    description: "Verified petition for annulment filed and docketed",
    status: "Pending",
    daysFromNow: 10,
    createdByEmail: "sofia.villanueva@aninolaw.com",
    notifyEmails: ["sofia.villanueva@aninolaw.com", "kevin.garcia@aninolaw.com"],
  },
  {
    caseTitle: "Alcantara Annulment Proceedings",
    title: "Psychological Evaluation Completed",
    description: "Court-accredited psychologist submits evaluation report on Article 36 incapacity",
    status: "Pending",
    daysFromNow: 14,
    createdByEmail: "sofia.villanueva@aninolaw.com",
    notifyEmails: ["sofia.villanueva@aninolaw.com"],
  },
  {
    caseTitle: "Navarro Estate Development Joint Venture",
    title: "Joint Venture Agreement Executed",
    description: "JVA signed by both parties before notary public",
    status: "Done",
    daysFromNow: -30,
    createdByEmail: "angela.mercado@aninolaw.com",
    notifyEmails: ["angela.mercado@aninolaw.com", "david.tan@aninolaw.com"],
  },
  {
    caseTitle: "Navarro Estate Development Joint Venture",
    title: "Permits and Licenses Secured",
    description: "All regulatory permits obtained from HLURB and local government",
    status: "Done",
    daysFromNow: -20,
    createdByEmail: "david.tan@aninolaw.com",
    notifyEmails: ["david.tan@aninolaw.com"],
  },
  {
    caseTitle: "Santiago Zoning Compliance Appeal",
    title: "Zoning Variance Application Filed",
    description: "Application for zoning variance submitted to Calamba City Zoning Board",
    status: "Done",
    daysFromNow: -3,
    createdByEmail: "gina.reyes@aninolaw.com",
    notifyEmails: ["gina.reyes@aninolaw.com", "nina.salvador@aninolaw.com"],
  },
  {
    caseTitle: "Santiago Zoning Compliance Appeal",
    title: "Zoning Board Hearing",
    description: "Scheduled hearing before Calamba City Zoning Board of Appeals",
    status: "Pending",
    daysFromNow: 21,
    createdByEmail: "gina.reyes@aninolaw.com",
    notifyEmails: ["gina.reyes@aninolaw.com"],
  },
  {
    caseTitle: "Lopez Property Boundary Litigation",
    title: "Site Inspection Completed",
    description:
      "On-site inspection with geodetic engineer confirms fence encroachment by 2.5 meters",
    status: "Done",
    daysFromNow: -5,
    createdByEmail: "marco.lopez@aninolaw.com",
    notifyEmails: ["marco.lopez@aninolaw.com", "benito.cruz@aninolaw.com"],
  },
  {
    caseTitle: "Lopez Property Boundary Litigation",
    title: "Complaint Filed with RTC",
    description: "Complaint for accion reivindicatoria filed with RTC Pasig",
    status: "Pending",
    daysFromNow: 7,
    createdByEmail: "marco.lopez@aninolaw.com",
    notifyEmails: ["marco.lopez@aninolaw.com"],
  },
  {
    caseTitle: "Villanueva Corporation Registration",
    title: "SEC Registration Approved",
    description: "SEC approved Articles of Incorporation for Villanueva Enterprises Inc.",
    status: "Done",
    daysFromNow: -45,
    createdByEmail: "angela.mercado@aninolaw.com",
    notifyEmails: ["angela.mercado@aninolaw.com", "maya.fernandez@aninolaw.com"],
  },
  {
    caseTitle: "Villanueva Corporation Registration",
    title: "Business Permits Secured",
    description: "Barangay clearance and mayor's permit obtained from Mandaluyong City Hall",
    status: "Done",
    daysFromNow: -30,
    createdByEmail: "angela.mercado@aninolaw.com",
    notifyEmails: ["maya.fernandez@aninolaw.com"],
  },
  {
    caseTitle: "Fernandez Criminal Defense — Estafa Case",
    title: "Motion to Dismiss Filed",
    description: "Motion to quash information for lack of probable cause filed with RTC Manila",
    status: "Done",
    daysFromNow: -10,
    createdByEmail: "ricardo.guevarra@aninolaw.com",
    notifyEmails: ["ricardo.guevarra@aninolaw.com", "nina.salvador@aninolaw.com"],
  },
  {
    caseTitle: "Fernandez Criminal Defense — Estafa Case",
    title: "Court Hearing on Motion",
    description: "Oral arguments scheduled on motion to dismiss before RTC Branch 32",
    status: "Pending",
    daysFromNow: 15,
    createdByEmail: "ricardo.guevarra@aninolaw.com",
    notifyEmails: ["ricardo.guevarra@aninolaw.com"],
  },
  {
    caseTitle: "Castillo Illegal Dismissal Complaint",
    title: "Complaint Filed with NLRC",
    description: "Illegal dismissal complaint filed with NLRC National Capital Region",
    status: "Done",
    daysFromNow: -7,
    createdByEmail: "miguel.cruz@aninolaw.com",
    notifyEmails: ["miguel.cruz@aninolaw.com", "jessica.lim@aninolaw.com"],
  },
  {
    caseTitle: "Castillo Illegal Dismissal Complaint",
    title: "NLRC Mediation Conference",
    description: "Scheduled mandatory conciliation and mediation conference before NLRC",
    status: "Pending",
    daysFromNow: 14,
    createdByEmail: "miguel.cruz@aninolaw.com",
    notifyEmails: ["miguel.cruz@aninolaw.com"],
  },
  {
    caseTitle: "Hernandez Property Tax Protest",
    title: "Appeal Filed with LBAA",
    description:
      "Notice of appeal and supporting documents filed with Local Board of Assessment Appeals",
    status: "Done",
    daysFromNow: -4,
    createdByEmail: "gina.reyes@aninolaw.com",
    notifyEmails: ["gina.reyes@aninolaw.com", "kevin.garcia@aninolaw.com"],
  },
  {
    caseTitle: "Hernandez Property Tax Protest",
    title: "LBAA Hearing",
    description: "Scheduled hearing before Local Board of Assessment Appeals",
    status: "Pending",
    daysFromNow: 28,
    createdByEmail: "gina.reyes@aninolaw.com",
    notifyEmails: ["gina.reyes@aninolaw.com"],
  },
  {
    caseTitle: "Ramirez Corp — Series A Funding",
    title: "Term Sheet Signed",
    description: "Signed term sheet with agreed valuation and investment amount",
    status: "Pending",
    daysFromNow: 10,
    createdByEmail: "angela.mercado@aninolaw.com",
    notifyEmails: ["angela.mercado@aninolaw.com", "sofia.ramirez@email.com"],
  },
  {
    caseTitle: "Ramirez Corp — Series A Funding",
    title: "Investment Agreement Executed",
    description: "Series A investment agreement fully executed and funds disbursed",
    status: "Pending",
    daysFromNow: 30,
    createdByEmail: "angela.mercado@aninolaw.com",
    notifyEmails: ["angela.mercado@aninolaw.com"],
  },
  {
    caseTitle: "Rodriguez Estate Settlement",
    title: "Estate Inventory Completed",
    description: "Complete inventory of estate assets and liabilities finalized and notarized",
    status: "Done",
    daysFromNow: -2,
    createdByEmail: "sofia.villanueva@aninolaw.com",
    notifyEmails: ["sofia.villanueva@aninolaw.com", "kevin.garcia@aninolaw.com"],
  },
  {
    caseTitle: "Rodriguez Estate Settlement",
    title: "Petition for Settlement Filed",
    description: "Petition for extrajudicial settlement of estate filed",
    status: "Pending",
    daysFromNow: 14,
    createdByEmail: "sofia.villanueva@aninolaw.com",
    notifyEmails: ["sofia.villanueva@aninolaw.com"],
  },
  {
    caseTitle: "Santos Foreclosure Defense",
    title: "Motion to Suspend Foreclosure Filed",
    description: "Urgent motion to enjoin extrajudicial foreclosure filed with RTC Makati",
    status: "Done",
    daysFromNow: -3,
    createdByEmail: "marco.lopez@aninolaw.com",
    notifyEmails: ["marco.lopez@aninolaw.com", "nina.salvador@aninolaw.com"],
  },
  {
    caseTitle: "Santos Foreclosure Defense",
    title: "Loan Restructuring Agreement Signed",
    description: "Restructured loan agreement executed with BPI Family Bank",
    status: "Pending",
    daysFromNow: 21,
    createdByEmail: "marco.lopez@aninolaw.com",
    notifyEmails: ["marco.lopez@aninolaw.com"],
  },
  {
    caseTitle: "Santos Foreclosure Defense",
    title: "TRO Issued by Court",
    description: "RTC Branch 45 issued a 72-hour TRO halting the extrajudicial foreclosure sale",
    status: "Done",
    daysFromNow: -2,
    createdByEmail: "marco.lopez@aninolaw.com",
    notifyEmails: ["marco.lopez@aninolaw.com", "nina.salvador@aninolaw.com"],
  },
  {
    caseTitle: "Dela Cruz Property Title Transfer",
    title: "BIR Tax Clearance Obtained",
    description: "BIR issued Certificate Authorizing Registration for transfer of title",
    status: "Pending",
    daysFromNow: 21,
    createdByEmail: "david.tan@aninolaw.com",
    notifyEmails: ["david.tan@aninolaw.com", "catherine.diaz@aninolaw.com"],
  },
  {
    caseTitle: "Gonzales Legal Separation",
    title: "Provisional Orders Issued",
    description:
      "Court issued provisional orders for spousal support and child custody pendente lite",
    status: "Pending",
    daysFromNow: 12,
    createdByEmail: "sofia.villanueva@aninolaw.com",
    notifyEmails: ["sofia.villanueva@aninolaw.com", "kevin.garcia@aninolaw.com"],
  },
  {
    caseTitle: "Ramirez Corp — Series A Funding",
    title: "Due Diligence Completed",
    description:
      "VC firm completed financial, legal, and technical due diligence with no material adverse findings",
    status: "Pending",
    daysFromNow: 14,
    createdByEmail: "angela.mercado@aninolaw.com",
    notifyEmails: ["angela.mercado@aninolaw.com", "maya.fernandez@aninolaw.com"],
  },
  {
    caseTitle: "Ramirez Corp — Series A Funding",
    title: "Shareholders Agreement Executed",
    description:
      "SHA signed by all existing shareholders and the VC fund, including drag-along and tag-along provisions",
    status: "Pending",
    daysFromNow: 35,
    createdByEmail: "angela.mercado@aninolaw.com",
    notifyEmails: ["angela.mercado@aninolaw.com"],
  },
  {
    caseTitle: "Rodriguez Estate Settlement",
    title: "Estate Tax Paid",
    description: "BIR Form 1801 filed and estate tax paid in full within the 6-month filing period",
    status: "Pending",
    daysFromNow: 28,
    createdByEmail: "sofia.villanueva@aninolaw.com",
    notifyEmails: ["sofia.villanueva@aninolaw.com", "kevin.garcia@aninolaw.com"],
  },
  {
    caseTitle: "Rodriguez Estate Settlement",
    title: "Extrajudicial Settlement Notarized",
    description:
      "Deed of extrajudicial settlement signed by all heirs and notarized before a notary public",
    status: "Pending",
    daysFromNow: 42,
    createdByEmail: "sofia.villanueva@aninolaw.com",
    notifyEmails: ["sofia.villanueva@aninolaw.com"],
  },
  {
    caseTitle: "Hernandez Property Tax Protest",
    title: "LBAA Decision Received",
    description:
      "Local Board of Assessment Appeals issued a decision reducing the assessed value from PHP 5.0M to PHP 3.2M",
    status: "Pending",
    daysFromNow: 35,
    createdByEmail: "gina.reyes@aninolaw.com",
    notifyEmails: ["gina.reyes@aninolaw.com", "kevin.garcia@aninolaw.com"],
  },
];

export async function seedMilestones(
  userByEmail: Record<string, string>,
  cases: { id: string; title: string }[],
): Promise<void> {
  const caseByTitle = Object.fromEntries(cases.map((c) => [c.title, c.id]));

  for (const m of milestones) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + m.daysFromNow);

    const milestone = await prisma.caseMilestone.create({
      data: {
        case_id: caseByTitle[m.caseTitle],
        title: m.title,
        description: m.description,
        due_date: dueDate,
        status: m.status,
        created_by_user_id: userByEmail[m.createdByEmail],
      },
    });

    for (const email of m.notifyEmails) {
      const userId = userByEmail[email];
      if (userId) {
        await prisma.notification.create({
          data: {
            user_id: userId,
            type:
              m.status === "Done"
                ? NotificationType.MilestoneCompleted
                : NotificationType.MilestoneStatusChanged,
            title: `Milestone: ${m.title}`,
            message: `Milestone "${m.title}" for case "${m.caseTitle}" is ${m.status === "Done" ? "completed" : "due on " + dueDate.toLocaleDateString()}`,
            is_read: m.status === "Done",
            milestone_id: milestone.id,
            case_id: caseByTitle[m.caseTitle],
            action_url: `/case/${caseByTitle[m.caseTitle]}`,
          },
        });
      }
    }
  }

  console.log(`Seeded ${milestones.length} milestones with notifications.`);
}
