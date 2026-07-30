import { prisma } from "@/lib/prisma";

interface DocumentData {
  fileName: string;
  fileType: string;
  fileSize: number;
  caseTitle?: string;
  taskTitle?: string;
  consultationClientEmail?: string;
  uploadedByEmail: string;
  daysAgo: number;
}

const documents: DocumentData[] = [
  {
    fileName: "TCT-12345-Certified-True-Copy.pdf",
    fileType: "application/pdf",
    fileSize: 2450000,
    caseTitle: "Dela Cruz Property Title Transfer",
    uploadedByEmail: "jessica.lim@aninolaw.com",
    daysAgo: 4,
  },
  {
    fileName: "Tax-Declaration-2024.pdf",
    fileType: "application/pdf",
    fileSize: 1800000,
    caseTitle: "Dela Cruz Property Title Transfer",
    uploadedByEmail: "jessica.lim@aninolaw.com",
    daysAgo: 3,
  },
  {
    fileName: "Deed-of-Sale-Draft.docx",
    fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileSize: 520000,
    caseTitle: "Dela Cruz Property Title Transfer",
    taskTitle: "Draft Deed of Absolute Sale",
    uploadedByEmail: "david.tan@aninolaw.com",
    daysAgo: 1,
  },
  {
    fileName: "Marriage-Certificate-Gonzales.pdf",
    fileType: "application/pdf",
    fileSize: 890000,
    caseTitle: "Gonzales Legal Separation",
    uploadedByEmail: "kevin.garcia@aninolaw.com",
    daysAgo: 7,
  },
  {
    fileName: "Counseling-Records-Confidential.pdf",
    fileType: "application/pdf",
    fileSize: 3200000,
    caseTitle: "Gonzales Legal Separation",
    uploadedByEmail: "sofia.villanueva@aninolaw.com",
    daysAgo: 5,
  },
  {
    fileName: "Supply-Agreement-Reyes-SML.pdf",
    fileType: "application/pdf",
    fileSize: 4100000,
    caseTitle: "Reyes vs. San Miguel Logistics",
    uploadedByEmail: "jessica.lim@aninolaw.com",
    daysAgo: 12,
  },
  {
    fileName: "Delivery-Receipts-Compiled.xlsx",
    fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileSize: 680000,
    caseTitle: "Reyes vs. San Miguel Logistics",
    taskTitle: "Review and Organize Contract Evidence",
    uploadedByEmail: "jessica.lim@aninolaw.com",
    daysAgo: 3,
  },
  {
    fileName: "Demand-Letter-SML.pdf",
    fileType: "application/pdf",
    fileSize: 340000,
    caseTitle: "Reyes vs. San Miguel Logistics",
    uploadedByEmail: "miguel.cruz@aninolaw.com",
    daysAgo: 15,
  },
  {
    fileName: "Wedding-Photos-Alcantara.zip",
    fileType: "application/zip",
    fileSize: 12500000,
    caseTitle: "Alcantara Annulment Proceedings",
    uploadedByEmail: "maya.fernandez@aninolaw.com",
    daysAgo: 4,
  },
  {
    fileName: "JVA-Navarro-Kingsbridge-Final.pdf",
    fileType: "application/pdf",
    fileSize: 2800000,
    caseTitle: "Navarro Estate Development Joint Venture",
    uploadedByEmail: "angela.mercado@aninolaw.com",
    daysAgo: 35,
  },
  {
    fileName: "HLURB-Clearance-Certificate.pdf",
    fileType: "application/pdf",
    fileSize: 1500000,
    caseTitle: "Navarro Estate Development Joint Venture",
    uploadedByEmail: "david.tan@aninolaw.com",
    daysAgo: 25,
  },
  {
    fileName: "Zoning-Variance-Application.pdf",
    fileType: "application/pdf",
    fileSize: 3200000,
    caseTitle: "Santiago Zoning Compliance Appeal",
    uploadedByEmail: "nina.salvador@aninolaw.com",
    daysAgo: 3,
  },
  {
    fileName: "Vicinity-Map-Santiago-Property.pdf",
    fileType: "application/pdf",
    fileSize: 5600000,
    caseTitle: "Santiago Zoning Compliance Appeal",
    uploadedByEmail: "gina.reyes@aninolaw.com",
    daysAgo: 2,
  },
  {
    fileName: "Geodetic-Survey-Lopez-Property.pdf",
    fileType: "application/pdf",
    fileSize: 4800000,
    caseTitle: "Lopez Property Boundary Litigation",
    uploadedByEmail: "marco.lopez@aninolaw.com",
    daysAgo: 5,
  },
  {
    fileName: "Witness-Affidavit-Cruz.pdf",
    fileType: "application/pdf",
    fileSize: 760000,
    caseTitle: "Lopez Property Boundary Litigation",
    uploadedByEmail: "paolo.guerrero@aninolaw.com",
    daysAgo: 2,
  },
  {
    fileName: "SEC-Name-Reservation.pdf",
    fileType: "application/pdf",
    fileSize: 250000,
    caseTitle: "Villanueva Corporation Registration",
    uploadedByEmail: "maya.fernandez@aninolaw.com",
    daysAgo: 48,
  },
  {
    fileName: "Articles-of-Incorporation-VEI.docx",
    fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileSize: 890000,
    caseTitle: "Villanueva Corporation Registration",
    uploadedByEmail: "angela.mercado@aninolaw.com",
    daysAgo: 45,
  },
  {
    fileName: "Complaint-Affidavit-Fernandez.pdf",
    fileType: "application/pdf",
    fileSize: 2100000,
    caseTitle: "Fernandez Criminal Defense — Estafa Case",
    uploadedByEmail: "ricardo.guevarra@aninolaw.com",
    daysAgo: 10,
  },
  {
    fileName: "Payment-Proves-GCash-Screenshots.pdf",
    fileType: "application/pdf",
    fileSize: 1800000,
    caseTitle: "Fernandez Criminal Defense — Estafa Case",
    uploadedByEmail: "nina.salvador@aninolaw.com",
    daysAgo: 3,
  },
  {
    fileName: "Motion-to-Dismiss-Estafa.pdf",
    fileType: "application/pdf",
    fileSize: 1400000,
    caseTitle: "Fernandez Criminal Defense — Estafa Case",
    taskTitle: "File Motion to Dismiss",
    uploadedByEmail: "ricardo.guevarra@aninolaw.com",
    daysAgo: 8,
  },
  {
    fileName: "Employment-Contract-Castillo.pdf",
    fileType: "application/pdf",
    fileSize: 950000,
    caseTitle: "Castillo Illegal Dismissal Complaint",
    uploadedByEmail: "jessica.lim@aninolaw.com",
    daysAgo: 6,
  },
  {
    fileName: "Payslips-Castillo-2024.xlsx",
    fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileSize: 340000,
    caseTitle: "Castillo Illegal Dismissal Complaint",
    uploadedByEmail: "jessica.lim@aninolaw.com",
    daysAgo: 5,
  },
  {
    fileName: "Termination-Notice-Castillo.pdf",
    fileType: "application/pdf",
    fileSize: 450000,
    caseTitle: "Castillo Illegal Dismissal Complaint",
    uploadedByEmail: "miguel.cruz@aninolaw.com",
    daysAgo: 7,
  },
  {
    fileName: "Assessment-Notice-Manila.pdf",
    fileType: "application/pdf",
    fileSize: 1200000,
    caseTitle: "Hernandez Property Tax Protest",
    uploadedByEmail: "paolo.guerrero@aninolaw.com",
    daysAgo: 4,
  },
  {
    fileName: "Comparable-Valuations-Research.xlsx",
    fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileSize: 280000,
    caseTitle: "Hernandez Property Tax Protest",
    uploadedByEmail: "kevin.garcia@aninolaw.com",
    daysAgo: 1,
  },
  {
    fileName: "Kairus-Capital-Term-Sheet.pdf",
    fileType: "application/pdf",
    fileSize: 3800000,
    caseTitle: "Ramirez Corp — Series A Funding",
    uploadedByEmail: "angela.mercado@aninolaw.com",
    daysAgo: 5,
  },
  {
    fileName: "Cap-Table-Ramirez-Tech.xlsx",
    fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileSize: 190000,
    caseTitle: "Ramirez Corp — Series A Funding",
    uploadedByEmail: "maya.fernandez@aninolaw.com",
    daysAgo: 3,
  },
  {
    fileName: "Estate-Inventory-Rodriguez.xlsx",
    fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileSize: 420000,
    caseTitle: "Rodriguez Estate Settlement",
    uploadedByEmail: "kevin.garcia@aninolaw.com",
    daysAgo: 2,
  },
  {
    fileName: "Death-Certificate-Manuel-Rodriguez.pdf",
    fileType: "application/pdf",
    fileSize: 670000,
    caseTitle: "Rodriguez Estate Settlement",
    uploadedByEmail: "sofia.villanueva@aninolaw.com",
    daysAgo: 5,
  },
  {
    fileName: "Loan-Agreement-Santos-BPI.pdf",
    fileType: "application/pdf",
    fileSize: 5600000,
    caseTitle: "Santos Foreclosure Defense",
    uploadedByEmail: "nina.salvador@aninolaw.com",
    daysAgo: 3,
  },
  {
    fileName: "Motion-to-Suspend-Foreclosure.pdf",
    fileType: "application/pdf",
    fileSize: 1200000,
    caseTitle: "Santos Foreclosure Defense",
    taskTitle: "File Motion to Suspend Foreclosure Sale",
    uploadedByEmail: "marco.lopez@aninolaw.com",
    daysAgo: 2,
  },
  {
    fileName: "Consultation-Notes-Hernandez.pdf",
    fileType: "application/pdf",
    fileSize: 340000,
    consultationClientEmail: "roberto.hernandez@email.com",
    uploadedByEmail: "gina.reyes@aninolaw.com",
    daysAgo: 14,
  },
  {
    fileName: "Last-Will-Alvarez-Executed.pdf",
    fileType: "application/pdf",
    fileSize: 890000,
    consultationClientEmail: "mercedes.alvarez@email.com",
    uploadedByEmail: "sofia.villanueva@aninolaw.com",
    daysAgo: 20,
  },
  {
    fileName: "Intake-Form-Rivera.pdf",
    fileType: "application/pdf",
    fileSize: 280000,
    consultationClientEmail: "victorino.rivera@email.com",
    uploadedByEmail: "jessica.lim@aninolaw.com",
    daysAgo: 5,
  },
  {
    fileName: "BIR-CAR-DelaCruz.pdf",
    fileType: "application/pdf",
    fileSize: 1100000,
    caseTitle: "Dela Cruz Property Title Transfer",
    uploadedByEmail: "david.tan@aninolaw.com",
    daysAgo: 2,
  },
  {
    fileName: "Provisional-Order-Gonzales.pdf",
    fileType: "application/pdf",
    fileSize: 850000,
    caseTitle: "Gonzales Legal Separation",
    uploadedByEmail: "sofia.villanueva@aninolaw.com",
    daysAgo: 5,
  },
  {
    fileName: "Opposition-to-MTD-Estafa.pdf",
    fileType: "application/pdf",
    fileSize: 1900000,
    caseTitle: "Fernandez Criminal Defense — Estafa Case",
    taskTitle: "File Motion to Dismiss",
    uploadedByEmail: "ricardo.guevarra@aninolaw.com",
    daysAgo: 4,
  },
  {
    fileName: "LBAA-Appeal-Hearing-Notice.pdf",
    fileType: "application/pdf",
    fileSize: 980000,
    caseTitle: "Hernandez Property Tax Protest",
    uploadedByEmail: "paolo.guerrero@aninolaw.com",
    daysAgo: 4,
  },
  {
    fileName: "Series-A-Diligence-Report.pdf",
    fileType: "application/pdf",
    fileSize: 4200000,
    caseTitle: "Ramirez Corp — Series A Funding",
    uploadedByEmail: "angela.mercado@aninolaw.com",
    daysAgo: 2,
  },
  {
    fileName: "Estate-Tax-Return-1801.pdf",
    fileType: "application/pdf",
    fileSize: 1500000,
    caseTitle: "Rodriguez Estate Settlement",
    uploadedByEmail: "sofia.villanueva@aninolaw.com",
    daysAgo: 1,
  },
  {
    fileName: "Loan-Restructuring-Proposal.pdf",
    fileType: "application/pdf",
    fileSize: 620000,
    caseTitle: "Santos Foreclosure Defense",
    uploadedByEmail: "marco.lopez@aninolaw.com",
    daysAgo: 1,
  },
  {
    fileName: "Psychological-Evaluation-Alcantara.pdf",
    fileType: "application/pdf",
    fileSize: 2800000,
    caseTitle: "Alcantara Annulment Proceedings",
    uploadedByEmail: "sofia.villanueva@aninolaw.com",
    daysAgo: 1,
  },
  {
    fileName: "Intake-Form-Carmela-Torres.pdf",
    fileType: "application/pdf",
    fileSize: 320000,
    consultationClientEmail: "carmela.torres@email.com",
    uploadedByEmail: "marco.lopez@aninolaw.com",
    daysAgo: 3,
  },
  {
    fileName: "NLRC-Notice-of-Conference-Castillo.pdf",
    fileType: "application/pdf",
    fileSize: 540000,
    caseTitle: "Castillo Illegal Dismissal Complaint",
    uploadedByEmail: "miguel.cruz@aninolaw.com",
    daysAgo: 2,
  },
  {
    fileName: "Reply-to-Opposition-TRO-Santos.pdf",
    fileType: "application/pdf",
    fileSize: 980000,
    taskTitle: "File Reply to Bank's Opposition to TRO Application",
    uploadedByEmail: "marco.lopez@aninolaw.com",
    daysAgo: 1,
  },
  {
    fileName: "Barangay-Mediation-Certificate-Lopez.pdf",
    fileType: "application/pdf",
    fileSize: 420000,
    caseTitle: "Lopez Property Boundary Litigation",
    uploadedByEmail: "marco.lopez@aninolaw.com",
    daysAgo: 6,
  },
];

export async function seedDocuments(
  userByEmail: Record<string, string>,
  clients: { id: string; email: string }[],
  cases: { id: string; title: string }[],
  tasks: { id: string; title: string }[],
): Promise<void> {
  const caseByTitle = Object.fromEntries(cases.map((c) => [c.title, c.id]));
  const taskByTitle = Object.fromEntries(tasks.map((t) => [t.title, t.id]));

  const allCons = await prisma.consultation.findMany({
    select: { id: true, client_id: true },
  });
  const clientIdToConId = Object.fromEntries(allCons.map((c) => [c.client_id, c.id]));
  const clientByEmail = Object.fromEntries(clients.map((c) => [c.email, c.id]));

  let count = 0;
  for (const d of documents) {
    const data: Record<string, unknown> = {
      file_name: d.fileName,
      file_path: `uploads/${d.fileName}`,
      file_type: d.fileType,
      file_size: d.fileSize,
      uploaded_by_user_id: userByEmail[d.uploadedByEmail],
    };

    if (d.caseTitle) {
      data.case_id = caseByTitle[d.caseTitle];
    }

    if (d.taskTitle) {
      data.task_id = taskByTitle[d.taskTitle];
    }

    if (d.consultationClientEmail) {
      const clientId = clientByEmail[d.consultationClientEmail];
      data.consultation_id = clientIdToConId[clientId];
    }

    await prisma.document.create({
      data: data as Parameters<typeof prisma.document.create>[0]["data"],
    });
    count++;
  }

  console.log(`Seeded ${count} documents.`);
}
