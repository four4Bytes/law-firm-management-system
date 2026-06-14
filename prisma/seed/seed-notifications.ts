import { prisma } from "@/lib/prisma";

interface SeedNotification {
  id: string;
  milestoneId: string;
  userEmail: string;
  is_read: boolean;
}

const milestoneIds = [
  "f0000000-0000-4000-a000-000000000001",
  "f0000000-0000-4000-a000-000000000002",
  "f0000000-0000-4000-a000-000000000003",
  "f0000000-0000-4000-a000-000000000004",
  "f0000000-0000-4000-a000-000000000005",
  "f0000000-0000-4000-a000-000000000006",
  "f0000000-0000-4000-a000-000000000007",
  "f0000000-0000-4000-a000-000000000008",
  "f0000000-0000-4000-a000-000000000009",
  "f0000000-0000-4000-a000-000000000010",
  "f0000000-0000-4000-a000-000000000011",
  "f0000000-0000-4000-a000-000000000012",
  "f0000000-0000-4000-a000-000000000013",
  "f0000000-0000-4000-a000-000000000014",
  "f0000000-0000-4000-a000-000000000015",
  "f0000000-0000-4000-a000-000000000016",
  "f0000000-0000-4000-a000-000000000017",
  "f0000000-0000-4000-a000-000000000018",
  "f0000000-0000-4000-a000-000000000019",
  "f0000000-0000-4000-a000-000000000020",
  "f0000000-0000-4000-a000-000000000021",
  "f0000000-0000-4000-a000-000000000022",
  "f0000000-0000-4000-a000-000000000023",
  "f0000000-0000-4000-a000-000000000024",
  "f0000000-0000-4000-a000-000000000025",
  "f0000000-0000-4000-a000-000000000026",
  "f0000000-0000-4000-a000-000000000027",
  "f0000000-0000-4000-a000-000000000028",
  "f0000000-0000-4000-a000-000000000029",
  "f0000000-0000-4000-a000-000000000030",
  "f0000000-0000-4000-a000-000000000031",
  "f0000000-0000-4000-a000-000000000032",
  "f0000000-0000-4000-a000-000000000033",
  "f0000000-0000-4000-a000-000000000034",
  "f0000000-0000-4000-a000-000000000035",
  "f0000000-0000-4000-a000-000000000036",
  "f0000000-0000-4000-a000-000000000037",
  "f0000000-0000-4000-a000-000000000038",
  "f0000000-0000-4000-a000-000000000039",
  "f0000000-0000-4000-a000-000000000040",
];

const userEmails = [
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
  "alice@lawfirm.com",
  "frank@lawfirm.com",
  "alice@lawfirm.com",
  "jack.lawyer@lawfirm.com",
  "nora@lawfirm.com",
  "eve@lawfirm.com",
  "dan@lawfirm.com",
  "grace.lawyer@lawfirm.com",
  "bob@lawfirm.com",
  "iris@lawfirm.com",
  "eve@lawfirm.com",
  "alice@lawfirm.com",
  "henry@lawfirm.com",
  "bob@lawfirm.com",
  "frank@lawfirm.com",
  "jack.lawyer@lawfirm.com",
  "carol@lawfirm.com",
  "alice@lawfirm.com",
  "nora@lawfirm.com",
  "dan@lawfirm.com",
  "alice@lawfirm.com",
  "frank@lawfirm.com",
  "alice@lawfirm.com",
  "jack.lawyer@lawfirm.com",
  "nora@lawfirm.com",
  "eve@lawfirm.com",
  "dan@lawfirm.com",
  "grace.lawyer@lawfirm.com",
  "bob@lawfirm.com",
  "iris@lawfirm.com",
];

const notifications: SeedNotification[] = milestoneIds.map((mid, i) => ({
  id: `a7000000-0000-4000-a000-000000000${String(i + 1).padStart(3, "0")}`,
  milestoneId: mid,
  userEmail: userEmails[i],
  is_read: i < 15,
}));

export async function seedNotifications() {
  let count = 0;

  for (const n of notifications) {
    const user = await prisma.user.findUnique({
      where: { email: n.userEmail },
      select: { id: true },
    });

    if (!user) {
      console.warn(`  Skipping notification: user ${n.userEmail} not found`);
      continue;
    }

    await prisma.milestoneNotification.upsert({
      where: { id: n.id },
      update: {},
      create: {
        id: n.id,
        milestone: { connect: { id: n.milestoneId } },
        user: { connect: { id: user.id } },
        is_read: n.is_read,
      },
    });
    count++;
  }

  console.log(`Seeded ${count} milestone notifications.`);
}
