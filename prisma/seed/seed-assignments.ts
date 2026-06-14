import { prisma } from "@/lib/prisma";

interface SeedAssignment {
  caseId: string;
  userEmail: string;
}

const assignments: SeedAssignment[] = [
  { caseId: "e0000000-0000-4000-a000-000000000001", userEmail: "alice@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000001", userEmail: "grace@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000001", userEmail: "bm.a@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000002", userEmail: "bob@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000002", userEmail: "hank@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000003", userEmail: "carol@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000003", userEmail: "ivy@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000004", userEmail: "dan@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000005", userEmail: "eve@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000005", userEmail: "leo@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000006", userEmail: "grace.lawyer@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000006", userEmail: "mia@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000006", userEmail: "bm.b@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000007", userEmail: "henry@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000007", userEmail: "noah@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000008", userEmail: "iris@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000008", userEmail: "opal@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000009", userEmail: "kate@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000009", userEmail: "pete@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000010", userEmail: "bob@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000010", userEmail: "hank@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000010", userEmail: "bm.c@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000011", userEmail: "carol@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000012", userEmail: "frank@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000012", userEmail: "grace@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000013", userEmail: "alice@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000013", userEmail: "ivy@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000014", userEmail: "jack.lawyer@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000015", userEmail: "nora@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000015", userEmail: "leo@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000016", userEmail: "eve@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000016", userEmail: "grace@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000017", userEmail: "dan@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000018", userEmail: "grace.lawyer@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000018", userEmail: "mia@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000018", userEmail: "bm.b@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000019", userEmail: "bob@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000020", userEmail: "iris@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000021", userEmail: "eve@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000021", userEmail: "noah@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000022", userEmail: "alice@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000022", userEmail: "opal@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000023", userEmail: "henry@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000023", userEmail: "pete@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000024", userEmail: "bob@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000025", userEmail: "frank@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000025", userEmail: "hank@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000026", userEmail: "jack.lawyer@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000027", userEmail: "carol@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000027", userEmail: "bm.d@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000028", userEmail: "alice@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000028", userEmail: "ivy@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000029", userEmail: "nora@lawfirm.com" },
  { caseId: "e0000000-0000-4000-a000-000000000030", userEmail: "dan@lawfirm.com" },
];

export async function seedAssignments() {
  let count = 0;

  for (const a of assignments) {
    const user = await prisma.user.findUnique({
      where: { email: a.userEmail },
      select: { id: true },
    });

    if (!user) {
      console.warn(`  Skipping assignment: user ${a.userEmail} not found`);
      continue;
    }

    await prisma.caseAssignment.upsert({
      where: {
        case_id_user_id: { case_id: a.caseId, user_id: user.id },
      },
      update: {},
      create: {
        case: { connect: { id: a.caseId } },
        user: { connect: { id: user.id } },
      },
    });
    count++;
  }

  console.log(`Seeded ${count} case assignments.`);
}
