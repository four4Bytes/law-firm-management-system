import { prisma } from "@/lib/prisma";

import { seedAuditLogs } from "./seed-audit-logs";
import { seedCases } from "./seed-cases";
import { seedClients } from "./seed-clients";
import { seedConsultations } from "./seed-consultations";
import { seedDocuments } from "./seed-documents";
import { seedMilestones } from "./seed-milestones";
import { seedNotes } from "./seed-notes";
import { seedPayments } from "./seed-payments";
import { seedTasks } from "./seed-tasks";
import { seedUsers } from "./seed-users";

async function cleanDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.note.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.caseMilestone.deleteMany();
  await prisma.taskReviewer.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.caseAssignment.deleteMany();
  await prisma.case.deleteMany();
  await prisma.consultation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.client.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  console.log("Database cleaned.");
}

async function main() {
  await cleanDatabase();

  const userByEmail = await seedUsers();
  const clients = await seedClients();
  const consultations = await seedConsultations(userByEmail, clients);
  const cases = await seedCases(userByEmail, clients, consultations);
  const tasks = await seedTasks(userByEmail, cases);
  await seedMilestones(userByEmail, cases);
  await seedPayments(userByEmail, clients, cases);
  await seedNotes(userByEmail, clients, cases);
  await seedDocuments(userByEmail, clients, cases, tasks);
  await seedAuditLogs(userByEmail);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
