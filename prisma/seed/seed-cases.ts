import { CaseStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

interface CaseData {
  clientEmail: string;
  title: string;
  type: string;
  status: CaseStatus;
  createdByEmail: string;
  sourceConsultationClientEmail?: string;
  partiesInvolved: string;
  assigneeEmails: string[];
}

const cases: CaseData[] = [
  {
    clientEmail: "juan.delacruz@email.com",
    title: "Dela Cruz Property Title Transfer",
    type: "Real Estate",
    status: "Open",
    createdByEmail: "catherine.diaz@aninolaw.com",
    sourceConsultationClientEmail: "juan.delacruz@email.com",
    partiesInvolved: "Juan M. Dela Cruz (Buyer), Nuvali Development Corp. (Seller)",
    assigneeEmails: ["david.tan@aninolaw.com", "jessica.lim@aninolaw.com"],
  },
  {
    clientEmail: "maria.gonzales@email.com",
    title: "Gonzales Legal Separation",
    type: "Family Law",
    status: "Open",
    createdByEmail: "sofia.villanueva@aninolaw.com",
    sourceConsultationClientEmail: "maria.gonzales@email.com",
    partiesInvolved: "Maria G. Gonzales (Petitioner), Ricardo Gonzales (Respondent)",
    assigneeEmails: ["sofia.villanueva@aninolaw.com", "kevin.garcia@aninolaw.com"],
  },
  {
    clientEmail: "carlos.reyes@email.com",
    title: "Reyes vs. San Miguel Logistics",
    type: "Civil Litigation",
    status: "Open",
    createdByEmail: "miguel.cruz@aninolaw.com",
    sourceConsultationClientEmail: "carlos.reyes@email.com",
    partiesInvolved: "Carlos M. Reyes (Plaintiff), San Miguel Logistics Inc. (Defendant)",
    assigneeEmails: ["miguel.cruz@aninolaw.com", "jessica.lim@aninolaw.com"],
  },
  {
    clientEmail: "fatima.alcantara@email.com",
    title: "Alcantara Annulment Proceedings",
    type: "Family Law",
    status: "Open",
    createdByEmail: "sofia.villanueva@aninolaw.com",
    sourceConsultationClientEmail: "fatima.alcantara@email.com",
    partiesInvolved: "Fatima D. Alcantara (Petitioner), Michael Alcantara (Respondent)",
    assigneeEmails: ["sofia.villanueva@aninolaw.com", "maya.fernandez@aninolaw.com"],
  },
  {
    clientEmail: "miguel.navarro@email.com",
    title: "Navarro Estate Development Joint Venture",
    type: "Real Estate",
    status: "Closed",
    createdByEmail: "catherine.diaz@aninolaw.com",
    sourceConsultationClientEmail: "miguel.navarro@email.com",
    partiesInvolved: "Miguel B. Navarro (Developer), Kingsbridge Capital HK Ltd. (Investor)",
    assigneeEmails: [
      "david.tan@aninolaw.com",
      "angela.mercado@aninolaw.com",
      "jessica.lim@aninolaw.com",
    ],
  },
  {
    clientEmail: "gregorio.santiago@email.com",
    title: "Santiago Zoning Compliance Appeal",
    type: "Real Estate",
    status: "Open",
    createdByEmail: "robert.santos@aninolaw.com",
    sourceConsultationClientEmail: "gregorio.santiago@email.com",
    partiesInvolved: "Gregorio T. Santiago (Applicant), Calamba City Zoning Board",
    assigneeEmails: ["gina.reyes@aninolaw.com", "nina.salvador@aninolaw.com"],
  },
  {
    clientEmail: "antonio.lopez@email.com",
    title: "Lopez Property Boundary Litigation",
    type: "Civil Litigation",
    status: "Open",
    createdByEmail: "mario.lopez@aninolaw.com",
    partiesInvolved: "Antonio S. Lopez (Plaintiff), Felipe Dimagiba (Defendant)",
    assigneeEmails: [
      "marco.lopez@aninolaw.com",
      "paolo.guerrero@aninolaw.com",
      "benito.cruz@aninolaw.com",
    ],
  },
  {
    clientEmail: "eduardo.villanueva@email.com",
    title: "Villanueva Corporation Registration",
    type: "Corporate",
    status: "Closed",
    createdByEmail: "angela.mercado@aninolaw.com",
    partiesInvolved: "Eduardo L. Villanueva (Sole Proprietor), SEC",
    assigneeEmails: ["angela.mercado@aninolaw.com", "maya.fernandez@aninolaw.com"],
  },
  {
    clientEmail: "danilo.fernandez@email.com",
    title: "Fernandez Criminal Defense — Estafa Case",
    type: "Criminal",
    status: "Open",
    createdByEmail: "ricardo.guevarra@aninolaw.com",
    partiesInvolved: "Danilo S. Fernandez (Accused), People of the Philippines",
    assigneeEmails: ["ricardo.guevarra@aninolaw.com", "nina.salvador@aninolaw.com"],
  },
  {
    clientEmail: "lily.castillo@email.com",
    title: "Castillo Illegal Dismissal Complaint",
    type: "Civil Litigation",
    status: "Open",
    createdByEmail: "miguel.cruz@aninolaw.com",
    partiesInvolved: "Lily M. Castillo (Complainant), Jollibee Foods Corp. (Respondent)",
    assigneeEmails: ["miguel.cruz@aninolaw.com", "jessica.lim@aninolaw.com"],
  },
  {
    clientEmail: "roberto.hernandez@email.com",
    title: "Hernandez Property Tax Protest",
    type: "Civil Litigation",
    status: "Open",
    createdByEmail: "gina.reyes@aninolaw.com",
    partiesInvolved: "Roberto S. Hernandez (Taxpayer), City of Manila Assessor's Office",
    assigneeEmails: ["gina.reyes@aninolaw.com", "kevin.garcia@aninolaw.com"],
  },
  {
    clientEmail: "sofia.ramirez@email.com",
    title: "Ramirez Corp — Series A Funding",
    type: "Corporate",
    status: "Open",
    createdByEmail: "angela.mercado@aninolaw.com",
    partiesInvolved: "Sofia D. Ramirez (Founder, Ramirez Tech Inc.), Venture Capital Fund",
    assigneeEmails: ["angela.mercado@aninolaw.com", "maya.fernandez@aninolaw.com"],
  },
  {
    clientEmail: "elena.rodriguez@email.com",
    title: "Rodriguez Estate Settlement",
    type: "Estate",
    status: "Open",
    createdByEmail: "sofia.villanueva@aninolaw.com",
    partiesInvolved: "Elena V. Rodriguez (Administrator), Estate of the late Manuel Rodriguez",
    assigneeEmails: ["sofia.villanueva@aninolaw.com", "kevin.garcia@aninolaw.com"],
  },
  {
    clientEmail: "catherine.santos@email.com",
    title: "Santos Foreclosure Defense",
    type: "Family Law",
    status: "Open",
    createdByEmail: "marco.lopez@aninolaw.com",
    partiesInvolved: "Catherine P. Santos (Homeowner), BPI Family Bank (Creditor)",
    assigneeEmails: ["marco.lopez@aninolaw.com", "nina.salvador@aninolaw.com"],
  },
];

export async function seedCases(
  userByEmail: Record<string, string>,
  clients: { id: string; email: string }[],
  consultations: { id: string; status: string }[],
): Promise<{ id: string; title: string }[]> {
  const clientByEmail = Object.fromEntries(clients.map((c) => [c.email, c.id]));

  const acceptedConsultations = consultations.filter((c) => c.status === "Accepted");
  const acceptedConClientIndex = new Map<string, number>();
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    if (c.sourceConsultationClientEmail) {
      acceptedConClientIndex.set(c.sourceConsultationClientEmail, i);
    }
  }

  const conByClientEmail = new Map<string, string>();
  const conData = cases.map((c) => c.sourceConsultationClientEmail).filter(Boolean) as string[];
  for (let i = 0; i < conData.length; i++) {
    if (i < acceptedConsultations.length) {
      conByClientEmail.set(conData[i], acceptedConsultations[i].id);
    }
  }

  const created: { id: string; title: string }[] = [];

  for (const c of cases) {
    const caseRecord = await prisma.case.create({
      data: {
        client_id: clientByEmail[c.clientEmail],
        case_title: c.title,
        case_type: c.type,
        status: c.status,
        created_by_user_id: userByEmail[c.createdByEmail],
        parties_involved: c.partiesInvolved,
        source_consultation_id: c.sourceConsultationClientEmail
          ? (conByClientEmail.get(c.sourceConsultationClientEmail) ?? null)
          : null,
      },
    });
    created.push({ id: caseRecord.id, title: c.title });

    for (const assigneeEmail of c.assigneeEmails) {
      await prisma.caseAssignment.create({
        data: {
          case_id: caseRecord.id,
          user_id: userByEmail[assigneeEmail],
        },
      });
    }
  }

  console.log(`Seeded ${created.length} cases with case assignments.`);
  return created;
}
