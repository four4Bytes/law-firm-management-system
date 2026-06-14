import { CaseMilestoneStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

interface SeedMilestone {
  id: string;
  caseId: string;
  title: string;
  description?: string;
  due_date: Date;
  status: CaseMilestoneStatus;
  creatorEmail: string;
}

const milestoneTitles = [
  "Initial Filing",
  "Document Review",
  "Discovery Phase",
  "Mediation Session",
  "Pre-Trial Motions",
  "Trial Preparation",
  "Settlement Negotiation",
  "Final Judgment",
  "Appeal Filing",
  "Case Closing",
];

const caseIds10 = [
  "e0000000-0000-4000-a000-000000000001",
  "e0000000-0000-4000-a000-000000000002",
  "e0000000-0000-4000-a000-000000000003",
  "e0000000-0000-4000-a000-000000000004",
  "e0000000-0000-4000-a000-000000000005",
  "e0000000-0000-4000-a000-000000000006",
  "e0000000-0000-4000-a000-000000000007",
  "e0000000-0000-4000-a000-000000000008",
  "e0000000-0000-4000-a000-000000000009",
  "e0000000-0000-4000-a000-000000000010",
];

const caseIds20 = [
  "e0000000-0000-4000-a000-000000000011",
  "e0000000-0000-4000-a000-000000000012",
  "e0000000-0000-4000-a000-000000000013",
  "e0000000-0000-4000-a000-000000000014",
  "e0000000-0000-4000-a000-000000000015",
  "e0000000-0000-4000-a000-000000000016",
  "e0000000-0000-4000-a000-000000000017",
  "e0000000-0000-4000-a000-000000000018",
  "e0000000-0000-4000-a000-000000000019",
  "e0000000-0000-4000-a000-000000000020",
];

const caseIds30 = [
  "e0000000-0000-4000-a000-000000000021",
  "e0000000-0000-4000-a000-000000000022",
  "e0000000-0000-4000-a000-000000000023",
  "e0000000-0000-4000-a000-000000000024",
  "e0000000-0000-4000-a000-000000000025",
  "e0000000-0000-4000-a000-000000000026",
  "e0000000-0000-4000-a000-000000000027",
  "e0000000-0000-4000-a000-000000000028",
  "e0000000-0000-4000-a000-000000000029",
  "e0000000-0000-4000-a000-000000000030",
];

const creatorEmails = [
  "alice@lawfirm.com",
  "bob@lawfirm.com",
  "carol@lawfirm.com",
  "dan@lawfirm.com",
  "eve@lawfirm.com",
  "grace.lawyer@lawfirm.com",
  "henry@lawfirm.com",
  "iris@lawfirm.com",
  "kate@lawfirm.com",
  "frank@lawfirm.com",
];

function buildMilestones(): SeedMilestone[] {
  const result: SeedMilestone[] = [];
  let idx = 1;

  for (let i = 0; i < 10; i++) {
    const caseId = caseIds10[i];
    const email = creatorEmails[i];
    result.push(
      {
        id: `f0000000-0000-4000-a000-000000000${String(idx++).padStart(3, "0")}`,
        caseId,
        title: milestoneTitles[0],
        description: "File initial complaint and summons",
        due_date: new Date(2026, 0, 15 + i),
        status: CaseMilestoneStatus.Done,
        creatorEmail: email,
      },
      {
        id: `f0000000-0000-4000-a000-000000000${String(idx++).padStart(3, "0")}`,
        caseId,
        title: milestoneTitles[1],
        due_date: new Date(2026, 1, 1 + i),
        status: CaseMilestoneStatus.Done,
        creatorEmail: email,
      },
      {
        id: `f0000000-0000-4000-a000-000000000${String(idx++).padStart(3, "0")}`,
        caseId,
        title: milestoneTitles[2],
        due_date: new Date(2026, 2, 1 + i),
        status: i < 3 ? CaseMilestoneStatus.Pending : CaseMilestoneStatus.Done,
        creatorEmail: email,
      },
      {
        id: `f0000000-0000-4000-a000-000000000${String(idx++).padStart(3, "0")}`,
        caseId,
        title: milestoneTitles[3],
        due_date: new Date(2026, 3, 1 + i),
        status: i < 5 ? CaseMilestoneStatus.Pending : CaseMilestoneStatus.Cancelled,
        creatorEmail: email,
      },
      {
        id: `f0000000-0000-4000-a000-000000000${String(idx++).padStart(3, "0")}`,
        caseId,
        title: milestoneTitles[6],
        due_date: new Date(2026, 4, 1 + i),
        status: CaseMilestoneStatus.Pending,
        creatorEmail: email,
      },
      {
        id: `f0000000-0000-4000-a000-000000000${String(idx++).padStart(3, "0")}`,
        caseId,
        title: milestoneTitles[9],
        due_date: new Date(2026, 5, 1 + i),
        status: CaseMilestoneStatus.Pending,
        creatorEmail: email,
      },
    );
  }

  for (let i = 0; i < 10; i++) {
    const caseId = caseIds20[i];
    const email = creatorEmails[i];
    result.push(
      {
        id: `f0000000-0000-4000-a000-000000000${String(idx++).padStart(3, "0")}`,
        caseId,
        title: milestoneTitles[0],
        due_date: new Date(2026, 0, 1 + i),
        status: CaseMilestoneStatus.Done,
        creatorEmail: email,
      },
      {
        id: `f0000000-0000-4000-a000-000000000${String(idx++).padStart(3, "0")}`,
        caseId,
        title: milestoneTitles[2],
        due_date: new Date(2026, 2, 1 + i),
        status: CaseMilestoneStatus.Done,
        creatorEmail: email,
      },
      {
        id: `f0000000-0000-4000-a000-000000000${String(idx++).padStart(3, "0")}`,
        caseId,
        title: milestoneTitles[9],
        due_date: new Date(2026, 5, 1 + i),
        status: i < 3 ? CaseMilestoneStatus.Pending : CaseMilestoneStatus.Done,
        creatorEmail: email,
      },
    );
  }

  for (let i = 0; i < 10; i++) {
    const caseId = caseIds30[i];
    const email = creatorEmails[i];
    result.push(
      {
        id: `f0000000-0000-4000-a000-000000000${String(idx++).padStart(3, "0")}`,
        caseId,
        title: milestoneTitles[0],
        due_date: new Date(2026, 0, 1 + i),
        status: CaseMilestoneStatus.Done,
        creatorEmail: email,
      },
      {
        id: `f0000000-0000-4000-a000-000000000${String(idx++).padStart(3, "0")}`,
        caseId,
        title: milestoneTitles[9],
        due_date: new Date(2026, 5, 1 + i),
        status: CaseMilestoneStatus.Pending,
        creatorEmail: email,
      },
    );
  }

  return result;
}

const milestones = buildMilestones();

export async function seedMilestones() {
  let count = 0;

  for (const m of milestones) {
    await prisma.caseMilestone.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        case: { connect: { id: m.caseId } },
        title: m.title,
        description: m.description ?? null,
        due_date: m.due_date,
        status: m.status,
        createdBy: { connect: { email: m.creatorEmail } },
      },
    });
    count++;
  }

  console.log(`Seeded ${count} case milestones.`);
}
