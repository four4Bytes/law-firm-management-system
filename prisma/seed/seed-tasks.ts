import { TaskStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

interface TaskData {
  caseTitle: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdByEmail: string;
  assigneeEmails: string[];
  reviewerEmail?: string;
}

const tasks: TaskData[] = [
  {
    caseTitle: "Dela Cruz Property Title Transfer",
    title: "Verify Property Title with Registry of Deeds",
    description:
      "Request certified true copy of TCT from Register of Deeds and verify no liens or encumbrances",
    status: "Ongoing",
    createdByEmail: "catherine.diaz@aninolaw.com",
    assigneeEmails: ["jessica.lim@aninolaw.com"],
  },
  {
    caseTitle: "Dela Cruz Property Title Transfer",
    title: "Draft Deed of Absolute Sale",
    description:
      "Prepare notarized Deed of Absolute Sale between Dela Cruz and Nuvali Development Corp.",
    status: "Pending",
    createdByEmail: "david.tan@aninolaw.com",
    assigneeEmails: ["david.tan@aninolaw.com"],
  },
  {
    caseTitle: "Dela Cruz Property Title Transfer",
    title: "Coordinate Tax Payment with BIR",
    description: "Compute and process capital gains tax and documentary stamp tax payments at BIR",
    status: "Submitted",
    createdByEmail: "catherine.diaz@aninolaw.com",
    assigneeEmails: ["jessica.lim@aninolaw.com"],
    reviewerEmail: "david.tan@aninolaw.com",
  },
  {
    caseTitle: "Gonzales Legal Separation",
    title: "Draft Petition for Legal Separation",
    description:
      "Draft verified petition citing grounds under Family Code, include custody and support requests",
    status: "Ongoing",
    createdByEmail: "sofia.villanueva@aninolaw.com",
    assigneeEmails: ["kevin.garcia@aninolaw.com"],
  },
  {
    caseTitle: "Gonzales Legal Separation",
    title: "Gather Evidence of Psychological Incapacity",
    description:
      "Collect medical records, witness affidavits, and counseling history to support Article 36 claim",
    status: "Submitted",
    createdByEmail: "sofia.villanueva@aninolaw.com",
    assigneeEmails: ["kevin.garcia@aninolaw.com"],
    reviewerEmail: "sofia.villanueva@aninolaw.com",
  },
  {
    caseTitle: "Gonzales Legal Separation",
    title: "Coordinate Service of Summons",
    description:
      "Serve summons and copy of petition to respondent at last known address in San Juan",
    status: "Pending",
    createdByEmail: "sofia.villanueva@aninolaw.com",
    assigneeEmails: ["ramon.flores@aninolaw.com"],
  },
  {
    caseTitle: "Reyes vs. San Miguel Logistics",
    title: "File Complaint with Regional Trial Court",
    description:
      "Prepare and file verified complaint for breach of contract with RTC Makati, Branch 56",
    status: "Ongoing",
    createdByEmail: "miguel.cruz@aninolaw.com",
    assigneeEmails: ["miguel.cruz@aninolaw.com"],
  },
  {
    caseTitle: "Reyes vs. San Miguel Logistics",
    title: "Review and Organize Contract Evidence",
    description: "Compile all correspondence, delivery receipts, and the original supply agreement",
    status: "Pending",
    createdByEmail: "miguel.cruz@aninolaw.com",
    assigneeEmails: ["jessica.lim@aninolaw.com"],
  },
  {
    caseTitle: "Reyes vs. San Miguel Logistics",
    title: "Prepare Pre-Trial Brief",
    description: "Draft pre-trial brief with stipulation of facts, issues, and witness list",
    status: "Pending",
    createdByEmail: "miguel.cruz@aninolaw.com",
    assigneeEmails: ["miguel.cruz@aninolaw.com"],
  },
  {
    caseTitle: "Alcantara Annulment Proceedings",
    title: "Draft Petition for Annulment",
    description:
      "Draft verified petition for declaration of nullity of marriage based on psychological incapacity",
    status: "Ongoing",
    createdByEmail: "sofia.villanueva@aninolaw.com",
    assigneeEmails: ["kevin.garcia@aninolaw.com"],
  },
  {
    caseTitle: "Alcantara Annulment Proceedings",
    title: "Secure Supporting Documents from Client",
    description:
      "Collect marriage certificate, birth certificates of children, and evidence of incapacity",
    status: "Submitted",
    createdByEmail: "sofia.villanueva@aninolaw.com",
    assigneeEmails: ["maya.fernandez@aninolaw.com"],
    reviewerEmail: "sofia.villanueva@aninolaw.com",
  },
  {
    caseTitle: "Alcantara Annulment Proceedings",
    title: "Coordinate Psychological Evaluation",
    description:
      "Schedule and coordinate with court-accredited psychologist for Article 36 evaluation",
    status: "Pending",
    createdByEmail: "sofia.villanueva@aninolaw.com",
    assigneeEmails: ["sofia.villanueva@aninolaw.com"],
  },
  {
    caseTitle: "Navarro Estate Development Joint Venture",
    title: "Draft Joint Venture Agreement",
    description:
      "Prepare JVA between Navarro and Kingsbridge Capital with profit-sharing and exit clauses",
    status: "Accepted",
    createdByEmail: "angela.mercado@aninolaw.com",
    assigneeEmails: ["angela.mercado@aninolaw.com"],
  },
  {
    caseTitle: "Navarro Estate Development Joint Venture",
    title: "Review Development Permits and Licenses",
    description:
      "Verify HLURB clearance, building permits, and environmental compliance certificates",
    status: "Accepted",
    createdByEmail: "david.tan@aninolaw.com",
    assigneeEmails: ["david.tan@aninolaw.com"],
  },
  {
    caseTitle: "Navarro Estate Development Joint Venture",
    title: "Conduct Due Diligence on Property",
    description: "Full title search, tax declaration verification, and zoning compliance check",
    status: "Accepted",
    createdByEmail: "david.tan@aninolaw.com",
    assigneeEmails: ["jessica.lim@aninolaw.com"],
  },
  {
    caseTitle: "Santiago Zoning Compliance Appeal",
    title: "File Zoning Variance Application",
    description: "Prepare and submit application for zoning variance to Calamba City Zoning Board",
    status: "Ongoing",
    createdByEmail: "robert.santos@aninolaw.com",
    assigneeEmails: ["nina.salvador@aninolaw.com"],
  },
  {
    caseTitle: "Santiago Zoning Compliance Appeal",
    title: "Prepare Property Survey and Documentation",
    description:
      "Commission geodetic survey and prepare vicinity map highlighting commercial access",
    status: "Pending",
    createdByEmail: "gina.reyes@aninolaw.com",
    assigneeEmails: ["gina.reyes@aninolaw.com"],
  },
  {
    caseTitle: "Santiago Zoning Compliance Appeal",
    title: "Coordinate with City Planning Office",
    description: "Schedule meeting with city planner to discuss zoning reclassification merits",
    status: "Pending",
    createdByEmail: "gina.reyes@aninolaw.com",
    assigneeEmails: ["nina.salvador@aninolaw.com"],
  },
  {
    caseTitle: "Lopez Property Boundary Litigation",
    title: "Conduct Site Inspection and Survey",
    description:
      "Visit property with geodetic engineer to verify boundary markers and encroachment",
    status: "Ongoing",
    createdByEmail: "marco.lopez@aninolaw.com",
    assigneeEmails: ["marco.lopez@aninolaw.com", "benito.cruz@aninolaw.com"],
  },
  {
    caseTitle: "Lopez Property Boundary Litigation",
    title: "Draft Complaint for Recovery of Possession",
    description:
      "Prepare complaint for accion reivindicatoria with technical description of property",
    status: "Pending",
    createdByEmail: "marco.lopez@aninolaw.com",
    assigneeEmails: ["marco.lopez@aninolaw.com"],
  },
  {
    caseTitle: "Lopez Property Boundary Litigation",
    title: "Gather Witness Testimonies",
    description:
      "Interview neighboring property owners and secure sworn affidavits on boundary history",
    status: "Pending",
    createdByEmail: "marco.lopez@aninolaw.com",
    assigneeEmails: ["paolo.guerrero@aninolaw.com"],
  },
  {
    caseTitle: "Villanueva Corporation Registration",
    title: "Register Corporation with SEC",
    description:
      "Process SEC registration including name reservation, filing of articles, and payment of fees",
    status: "Accepted",
    createdByEmail: "angela.mercado@aninolaw.com",
    assigneeEmails: ["maya.fernandez@aninolaw.com"],
  },
  {
    caseTitle: "Villanueva Corporation Registration",
    title: "Draft Articles of Incorporation and By-Laws",
    description:
      "Draft AOI and by-laws for Villanueva Enterprises Inc. with P5M authorized capital",
    status: "Accepted",
    createdByEmail: "angela.mercado@aninolaw.com",
    assigneeEmails: ["angela.mercado@aninolaw.com"],
  },
  {
    caseTitle: "Villanueva Corporation Registration",
    title: "Secure Barangay and Mayor's Permits",
    description: "Apply for business permits with Mandaluyong City Hall and Barangay Barangka",
    status: "Accepted",
    createdByEmail: "angela.mercado@aninolaw.com",
    assigneeEmails: ["maya.fernandez@aninolaw.com"],
  },
  {
    caseTitle: "Fernandez Criminal Defense — Estafa Case",
    title: "File Motion to Dismiss",
    description:
      "Draft motion to quash information for lack of probable cause — construction payment dispute",
    status: "Ongoing",
    createdByEmail: "ricardo.guevarra@aninolaw.com",
    assigneeEmails: ["ricardo.guevarra@aninolaw.com"],
  },
  {
    caseTitle: "Fernandez Criminal Defense — Estafa Case",
    title: "Review Prosecution Evidence",
    description:
      "Examine complaint affidavit, supporting documents, and counter-affidavit of complainant",
    status: "Ongoing",
    createdByEmail: "ricardo.guevarra@aninolaw.com",
    assigneeEmails: ["nina.salvador@aninolaw.com"],
  },
  {
    caseTitle: "Fernandez Criminal Defense — Estafa Case",
    title: "Prepare Defense Strategy Memorandum",
    description:
      "Draft comprehensive defense memorandum highlighting payment records and lack of deceit",
    status: "Pending",
    createdByEmail: "ricardo.guevarra@aninolaw.com",
    assigneeEmails: ["ricardo.guevarra@aninolaw.com"],
  },
  {
    caseTitle: "Castillo Illegal Dismissal Complaint",
    title: "Draft Complaint for Illegal Dismissal",
    description:
      "Prepare complaint for illegal dismissal with NLRC including prayer for reinstatement and back wages",
    status: "Ongoing",
    createdByEmail: "miguel.cruz@aninolaw.com",
    assigneeEmails: ["miguel.cruz@aninolaw.com"],
  },
  {
    caseTitle: "Castillo Illegal Dismissal Complaint",
    title: "Gather Employment Records and Contracts",
    description:
      "Collect employment contract, payslips, attendance records, and termination notice from client",
    status: "Submitted",
    createdByEmail: "miguel.cruz@aninolaw.com",
    assigneeEmails: ["jessica.lim@aninolaw.com"],
    reviewerEmail: "miguel.cruz@aninolaw.com",
  },
  {
    caseTitle: "Castillo Illegal Dismissal Complaint",
    title: "Calculate Back Wages and Separation Pay",
    description:
      "Compute back wages from date of dismissal plus 13th month pay and other monetary claims",
    status: "Pending",
    createdByEmail: "miguel.cruz@aninolaw.com",
    assigneeEmails: ["jessica.lim@aninolaw.com"],
  },
  {
    caseTitle: "Hernandez Property Tax Protest",
    title: "File Appeal with Local Board of Assessment Appeals",
    description:
      "Prepare notice of appeal and supporting documents contesting the doubled assessed value",
    status: "Ongoing",
    createdByEmail: "gina.reyes@aninolaw.com",
    assigneeEmails: ["paolo.guerrero@aninolaw.com"],
  },
  {
    caseTitle: "Hernandez Property Tax Protest",
    title: "Gather Comparable Property Valuations",
    description:
      "Research and document assessed values of similar neighboring properties as comparison evidence",
    status: "Pending",
    createdByEmail: "gina.reyes@aninolaw.com",
    assigneeEmails: ["kevin.garcia@aninolaw.com"],
  },
  {
    caseTitle: "Hernandez Property Tax Protest",
    title: "Prepare Legal Memorandum",
    description:
      "Draft legal memo citing R.A. 7160 provisions on property assessment and valuation standards",
    status: "Pending",
    createdByEmail: "gina.reyes@aninolaw.com",
    assigneeEmails: ["gina.reyes@aninolaw.com"],
  },
  {
    caseTitle: "Ramirez Corp — Series A Funding",
    title: "Draft Series A Investment Agreement",
    description:
      "Prepare investment agreement with anti-dilution, liquidation preference, and board seat provisions",
    status: "Pending",
    createdByEmail: "angela.mercado@aninolaw.com",
    assigneeEmails: ["angela.mercado@aninolaw.com"],
  },
  {
    caseTitle: "Ramirez Corp — Series A Funding",
    title: "Review Term Sheet from VC Firm",
    description:
      "Review and negotiate 20-page term sheet including valuation, vesting schedule, and drag-along rights",
    status: "Pending",
    createdByEmail: "angela.mercado@aninolaw.com",
    assigneeEmails: ["angela.mercado@aninolaw.com"],
  },
  {
    caseTitle: "Ramirez Corp — Series A Funding",
    title: "Conduct Legal Due Diligence on Company",
    description:
      "Verify incorporation documents, IP ownership, employment contracts, and cap table",
    status: "Pending",
    createdByEmail: "angela.mercado@aninolaw.com",
    assigneeEmails: ["maya.fernandez@aninolaw.com"],
  },
  {
    caseTitle: "Rodriguez Estate Settlement",
    title: "Inventory Estate Assets and Liabilities",
    description:
      "Compile complete inventory of real properties, bank accounts, investments, and outstanding debts",
    status: "Ongoing",
    createdByEmail: "sofia.villanueva@aninolaw.com",
    assigneeEmails: ["kevin.garcia@aninolaw.com"],
  },
  {
    caseTitle: "Rodriguez Estate Settlement",
    title: "File Petition for Settlement of Estate",
    description:
      "Prepare and file petition for extrajudicial settlement or judicial administration as applicable",
    status: "Pending",
    createdByEmail: "sofia.villanueva@aninolaw.com",
    assigneeEmails: ["sofia.villanueva@aninolaw.com"],
  },
  {
    caseTitle: "Rodriguez Estate Settlement",
    title: "Coordinate with BIR for Estate Tax Payment",
    description:
      "Prepare estate tax return (BIR Form 1801) and process payment within the 6-month filing period",
    status: "Pending",
    createdByEmail: "sofia.villanueva@aninolaw.com",
    assigneeEmails: ["jessica.lim@aninolaw.com"],
  },
  {
    caseTitle: "Santos Foreclosure Defense",
    title: "Review Loan Documents for Predatory Clauses",
    description:
      "Examine promissory note and mortgage contract for hidden fees, balloon payments, and usurious interest",
    status: "Ongoing",
    createdByEmail: "marco.lopez@aninolaw.com",
    assigneeEmails: ["nina.salvador@aninolaw.com"],
  },
  {
    caseTitle: "Santos Foreclosure Defense",
    title: "File Motion to Suspend Foreclosure Sale",
    description:
      "Draft urgent motion to enjoin extrajudicial foreclosure, citing deficiency in notice requirements",
    status: "Submitted",
    createdByEmail: "marco.lopez@aninolaw.com",
    assigneeEmails: ["marco.lopez@aninolaw.com"],
    reviewerEmail: "maria.anino@aninolaw.com",
  },
  {
    caseTitle: "Santos Foreclosure Defense",
    title: "Negotiate Loan Restructuring with Bank",
    description:
      "Propose loan restructuring plan with reduced interest and extended amortization schedule",
    status: "Pending",
    createdByEmail: "marco.lopez@aninolaw.com",
    assigneeEmails: ["marco.lopez@aninolaw.com"],
  },
  {
    caseTitle: "Dela Cruz Property Title Transfer",
    title: "Coordinate with Registry of Deeds for Title Transfer",
    description:
      "Process the transfer of TCT from seller to buyer once deed of sale is notarized and taxes are paid",
    status: "Pending",
    createdByEmail: "david.tan@aninolaw.com",
    assigneeEmails: ["jessica.lim@aninolaw.com"],
  },
  {
    caseTitle: "Reyes vs. San Miguel Logistics",
    title: "Prepare Judicial Affidavits for Witnesses",
    description:
      "Draft judicial affidavits for three witnesses — client, warehouse supervisor, and delivery coordinator",
    status: "Submitted",
    createdByEmail: "miguel.cruz@aninolaw.com",
    assigneeEmails: ["jessica.lim@aninolaw.com"],
    reviewerEmail: "miguel.cruz@aninolaw.com",
  },
  {
    caseTitle: "Alcantara Annulment Proceedings",
    title: "Revise Petition per Supervising Counsel Comments",
    description:
      "Revise the petition to strengthen Article 36 psychological incapacity argument — initial draft lacked specific factual basis",
    status: "Rejected",
    createdByEmail: "sofia.villanueva@aninolaw.com",
    assigneeEmails: ["kevin.garcia@aninolaw.com"],
    reviewerEmail: "sofia.villanueva@aninolaw.com",
  },
  {
    caseTitle: "Castillo Illegal Dismissal Complaint",
    title: "Attend NLRC Mandatory Conciliation and Mediation",
    description:
      "Represent client at NLRC mandatory conference with Jollibee Foods Corp. representatives and their counsel",
    status: "Ongoing",
    createdByEmail: "miguel.cruz@aninolaw.com",
    assigneeEmails: ["miguel.cruz@aninolaw.com"],
  },
  {
    caseTitle: "Santos Foreclosure Defense",
    title: "File Reply to Bank's Opposition to TRO Application",
    description:
      "Draft and file reply memorandum addressing BPI Family Bank's opposition to the 72-hour TRO",
    status: "Ongoing",
    createdByEmail: "marco.lopez@aninolaw.com",
    assigneeEmails: ["marco.lopez@aninolaw.com"],
    reviewerEmail: "maria.anino@aninolaw.com",
  },
];

export async function seedTasks(
  userByEmail: Record<string, string>,
  cases: { id: string; title: string }[],
): Promise<{ id: string; title: string }[]> {
  const caseByTitle = Object.fromEntries(cases.map((c) => [c.title, c.id]));
  const created: { id: string; title: string }[] = [];

  for (const t of tasks) {
    const task = await prisma.task.create({
      data: {
        case_id: caseByTitle[t.caseTitle],
        title: t.title,
        description: t.description,
        status: t.status,
        created_by_user_id: userByEmail[t.createdByEmail],
      },
    });
    created.push({ id: task.id, title: t.title });

    for (const email of t.assigneeEmails) {
      await prisma.taskAssignment.create({
        data: {
          task_id: task.id,
          user_id: userByEmail[email],
        },
      });
    }

    if (t.reviewerEmail) {
      await prisma.taskReviewer.create({
        data: {
          task_id: task.id,
          reviewer_user_id: userByEmail[t.reviewerEmail],
          delegated_by_userid: userByEmail[t.createdByEmail],
          is_active: true,
        },
      });
    }
  }

  console.log(`Seeded ${created.length} tasks with assignments and reviewers.`);
  return created;
}
