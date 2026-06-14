import { prisma } from "@/lib/prisma";

import { seedAssignments } from "./seed-assignments";
import { seedCases } from "./seed-cases";
import { seedClients } from "./seed-clients";
import { seedConsultations } from "./seed-consultations";
import { seedMilestones } from "./seed-milestones";
import { seedNotifications } from "./seed-notifications";
import { seedUsers } from "./seed-users";

async function main() {
  await seedUsers();
  await seedClients();
  await seedConsultations();
  await seedCases();
  await seedAssignments();
  await seedMilestones();
  await seedNotifications();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
