import { PaymentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

interface PaymentData {
  amount: number;
  paymentDateDaysAgo: number;
  status: PaymentStatus;
  method: string;
  receipt: string;
  caseTitle?: string;
  consultationClientEmail?: string;
  createdByEmail: string;
}

const payments: PaymentData[] = [
  {
    amount: 1500,
    paymentDateDaysAgo: 14,
    status: "Paid",
    method: "GCash",
    receipt: "RC-2024-001",
    consultationClientEmail: "roberto.hernandez@email.com",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 1500,
    paymentDateDaysAgo: 10,
    status: "Paid",
    method: "Bank Transfer",
    receipt: "RC-2024-002",
    consultationClientEmail: "catherine.santos@email.com",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 2000,
    paymentDateDaysAgo: 7,
    status: "Paid",
    method: "Cash",
    receipt: "RC-2024-003",
    consultationClientEmail: "jean.garcia@email.com",
    createdByEmail: "james.reyes@aninolaw.com",
  },
  {
    amount: 2500,
    paymentDateDaysAgo: 21,
    status: "Paid",
    method: "Bank Transfer",
    receipt: "RC-2024-004",
    consultationClientEmail: "mercedes.alvarez@email.com",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 2000,
    paymentDateDaysAgo: 30,
    status: "Paid",
    method: "GCash",
    receipt: "RC-2024-005",
    consultationClientEmail: "juan.delacruz@email.com",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 1500,
    paymentDateDaysAgo: 25,
    status: "Paid",
    method: "Bank Transfer",
    receipt: "RC-2024-006",
    consultationClientEmail: "maria.gonzales@email.com",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 2000,
    paymentDateDaysAgo: 20,
    status: "Paid",
    method: "Check",
    receipt: "RC-2024-007",
    consultationClientEmail: "carlos.reyes@email.com",
    createdByEmail: "james.reyes@aninolaw.com",
  },
  {
    amount: 2500,
    paymentDateDaysAgo: 18,
    status: "Paid",
    method: "GCash",
    receipt: "RC-2024-008",
    consultationClientEmail: "fatima.alcantara@email.com",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 3000,
    paymentDateDaysAgo: 60,
    status: "Paid",
    method: "Check",
    receipt: "RC-2024-009",
    consultationClientEmail: "miguel.navarro@email.com",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 2000,
    paymentDateDaysAgo: 15,
    status: "Paid",
    method: "Bank Transfer",
    receipt: "RC-2024-010",
    consultationClientEmail: "gregorio.santiago@email.com",
    createdByEmail: "robert.santos@aninolaw.com",
  },
  {
    amount: 50000,
    paymentDateDaysAgo: 28,
    status: "Paid",
    method: "Bank Transfer",
    receipt: "RET-2024-001",
    caseTitle: "Dela Cruz Property Title Transfer",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 60000,
    paymentDateDaysAgo: 23,
    status: "Partial",
    method: "GCash",
    receipt: "RET-2024-002",
    caseTitle: "Gonzales Legal Separation",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 80000,
    paymentDateDaysAgo: 18,
    status: "Unpaid",
    method: "",
    receipt: "RET-2024-003",
    caseTitle: "Reyes vs. San Miguel Logistics",
    createdByEmail: "james.reyes@aninolaw.com",
  },
  {
    amount: 55000,
    paymentDateDaysAgo: 16,
    status: "Paid",
    method: "Bank Transfer",
    receipt: "RET-2024-004",
    caseTitle: "Alcantara Annulment Proceedings",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 150000,
    paymentDateDaysAgo: 55,
    status: "Paid",
    method: "Check",
    receipt: "RET-2024-005",
    caseTitle: "Navarro Estate Development Joint Venture",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 40000,
    paymentDateDaysAgo: 13,
    status: "Unpaid",
    method: "",
    receipt: "RET-2024-006",
    caseTitle: "Santiago Zoning Compliance Appeal",
    createdByEmail: "robert.santos@aninolaw.com",
  },
  {
    amount: 45000,
    paymentDateDaysAgo: 5,
    status: "Partial",
    method: "GCash",
    receipt: "RET-2024-007",
    caseTitle: "Lopez Property Boundary Litigation",
    createdByEmail: "maria.anino@aninolaw.com",
  },
  {
    amount: 25000,
    paymentDateDaysAgo: 45,
    status: "Paid",
    method: "Bank Transfer",
    receipt: "RET-2024-008",
    caseTitle: "Villanueva Corporation Registration",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 70000,
    paymentDateDaysAgo: 10,
    status: "Partial",
    method: "Cash",
    receipt: "RET-2024-009",
    caseTitle: "Fernandez Criminal Defense — Estafa Case",
    createdByEmail: "james.reyes@aninolaw.com",
  },
  {
    amount: 35000,
    paymentDateDaysAgo: 7,
    status: "Paid",
    method: "Bank Transfer",
    receipt: "RET-2024-010",
    caseTitle: "Castillo Illegal Dismissal Complaint",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 30000,
    paymentDateDaysAgo: 4,
    status: "Unpaid",
    method: "",
    receipt: "RET-2024-011",
    caseTitle: "Hernandez Property Tax Protest",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 100000,
    paymentDateDaysAgo: 2,
    status: "Unpaid",
    method: "",
    receipt: "RET-2024-012",
    caseTitle: "Ramirez Corp — Series A Funding",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 45000,
    paymentDateDaysAgo: 2,
    status: "Unpaid",
    method: "",
    receipt: "RET-2024-013",
    caseTitle: "Rodriguez Estate Settlement",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 40000,
    paymentDateDaysAgo: 3,
    status: "Partial",
    method: "GCash",
    receipt: "RET-2024-014",
    caseTitle: "Santos Foreclosure Defense",
    createdByEmail: "james.reyes@aninolaw.com",
  },
  {
    amount: 25000,
    paymentDateDaysAgo: 25,
    status: "Paid",
    method: "Bank Transfer",
    receipt: "MIL-2024-001",
    caseTitle: "Reyes vs. San Miguel Logistics",
    createdByEmail: "james.reyes@aninolaw.com",
  },
  {
    amount: 75000,
    paymentDateDaysAgo: 28,
    status: "Paid",
    method: "Check",
    receipt: "MIL-2024-002",
    caseTitle: "Navarro Estate Development Joint Venture",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 20000,
    paymentDateDaysAgo: 3,
    status: "Paid",
    method: "GCash",
    receipt: "MIL-2024-003",
    caseTitle: "Santiago Zoning Compliance Appeal",
    createdByEmail: "robert.santos@aninolaw.com",
  },
  {
    amount: 15000,
    paymentDateDaysAgo: 5,
    status: "Paid",
    method: "Bank Transfer",
    receipt: "MIL-2024-004",
    caseTitle: "Lopez Property Boundary Litigation",
    createdByEmail: "maria.anino@aninolaw.com",
  },
  {
    amount: 20000,
    paymentDateDaysAgo: 7,
    status: "Partial",
    method: "GCash",
    receipt: "MIL-2024-005",
    caseTitle: "Castillo Illegal Dismissal Complaint",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 10000,
    paymentDateDaysAgo: 12,
    status: "Paid",
    method: "Cash",
    receipt: "MIL-2024-006",
    caseTitle: "Santos Foreclosure Defense",
    createdByEmail: "james.reyes@aninolaw.com",
  },
  {
    amount: 30000,
    paymentDateDaysAgo: 10,
    status: "Paid",
    method: "Bank Transfer",
    receipt: "RET-2024-015",
    caseTitle: "Fernandez Criminal Defense — Estafa Case",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 45000,
    paymentDateDaysAgo: 5,
    status: "Paid",
    method: "Bank Transfer",
    receipt: "RET-2024-016",
    caseTitle: "Rodriguez Estate Settlement",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 25000,
    paymentDateDaysAgo: 7,
    status: "Paid",
    method: "GCash",
    receipt: "MIL-2024-007",
    caseTitle: "Dela Cruz Property Title Transfer",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 30000,
    paymentDateDaysAgo: 10,
    status: "Unpaid",
    method: "",
    receipt: "MIL-2024-008",
    caseTitle: "Alcantara Annulment Proceedings",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 15000,
    paymentDateDaysAgo: 5,
    status: "Paid",
    method: "Cash",
    receipt: "MIL-2024-009",
    caseTitle: "Lopez Property Boundary Litigation",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 2500,
    paymentDateDaysAgo: 21,
    status: "Paid",
    method: "Bank Transfer",
    receipt: "RC-2024-012",
    consultationClientEmail: "mercedes.alvarez@email.com",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 30000,
    paymentDateDaysAgo: 6,
    status: "Paid",
    method: "GCash",
    receipt: "RET-2024-017",
    caseTitle: "Hernandez Property Tax Protest",
    createdByEmail: "james.reyes@aninolaw.com",
  },
  {
    amount: 20000,
    paymentDateDaysAgo: 7,
    status: "Paid",
    method: "Bank Transfer",
    receipt: "MIL-2024-010",
    caseTitle: "Castillo Illegal Dismissal Complaint",
    createdByEmail: "james.reyes@aninolaw.com",
  },
  {
    amount: 1500,
    paymentDateDaysAgo: 2,
    status: "Paid",
    method: "GCash",
    receipt: "RC-2024-013",
    consultationClientEmail: "patricia.luna@email.com",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 1500,
    paymentDateDaysAgo: 3,
    status: "Paid",
    method: "GCash",
    receipt: "RC-2024-014",
    consultationClientEmail: "carmela.torres@email.com",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 50000,
    paymentDateDaysAgo: 1,
    status: "Partial",
    method: "Bank Transfer",
    receipt: "RET-2024-018",
    caseTitle: "Ramirez Corp — Series A Funding",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
  {
    amount: 15000,
    paymentDateDaysAgo: 3,
    status: "Paid",
    method: "GCash",
    receipt: "MIL-2024-011",
    caseTitle: "Dela Cruz Property Title Transfer",
    createdByEmail: "catherine.diaz@aninolaw.com",
  },
];

type PaymentInput = {
  amount: number;
  payment_date: Date;
  status: PaymentStatus;
  payment_method: string | null;
  receipt_number: string;
  created_by_user_id: string;
  case_id?: string;
  consultation_id?: string;
};

export async function seedPayments(
  userByEmail: Record<string, string>,
  clients: { id: string; email: string }[],
  cases: { id: string; title: string }[],
): Promise<void> {
  const caseByTitle = Object.fromEntries(cases.map((c) => [c.title, c.id]));
  const clientByEmail = Object.fromEntries(clients.map((c) => [c.email, c.id]));

  const allCons = await prisma.consultation.findMany({ select: { id: true, client_id: true } });
  const clientIdToConId: Record<string, string> = {};
  for (const c of allCons) {
    clientIdToConId[c.client_id] = c.id;
  }

  for (const p of payments) {
    const paymentDate = new Date();
    paymentDate.setDate(paymentDate.getDate() - p.paymentDateDaysAgo);

    const data: PaymentInput = {
      amount: p.amount,
      payment_date: paymentDate,
      status: p.status,
      payment_method: p.method || null,
      receipt_number: p.receipt,
      created_by_user_id: userByEmail[p.createdByEmail],
    };

    if (p.caseTitle) {
      data.case_id = caseByTitle[p.caseTitle];
    }

    if (p.consultationClientEmail) {
      const clientId = clientByEmail[p.consultationClientEmail];
      data.consultation_id = clientIdToConId[clientId];
    }

    await prisma.payment.create({ data });
  }

  console.log(`Seeded ${payments.length} payments.`);
}
