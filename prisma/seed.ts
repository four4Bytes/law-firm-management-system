import {
  Role,
  ConsultationStatus,
  CaseStatus,
  TaskStatus,
  PaymentStatus,
} from "../src/generated/prisma/enums.js";
import { prisma } from "../src/lib/prisma";
import { faker } from "@faker-js/faker";

async function main() {
  // 1. Seed Users
  const roles: Role[] = [
    "SuperAdmin",
    "Admin",
    "Lawyer",
    "Paralegal",
    "ProcessServer",
  ];
  const users = [];
  for (let i = 0; i < 10; i++) {
    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        role: roles[Math.floor(Math.random() * roles.length)],
      },
    });
    users.push(user);
  }

  // 2. Seed Clients
  const clients = [];
  for (let i = 0; i < 5; i++) {
    const client = await prisma.client.create({
      data: {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone_number: faker.phone.number(),
        address: faker.location.streetAddress(),
      },
    });
    clients.push(client);
  }

  // 3. Seed Consultations
  const consultations = [];
  for (let i = 0; i < 10; i++) {
    const consultation = await prisma.consultation.create({
      data: {
        client_id: clients[i % clients.length].id,
        created_by_user_id: users[i % users.length].id,
        booking_datetime: faker.date.future(),
        concern: faker.lorem.sentence(),
        status: ConsultationStatus.Scheduled,
      },
    });
    consultations.push(consultation);
  }

  // 4. Seed Cases
  const cases = [];
  for (let i = 0; i < 8; i++) {
    const caseRecord = await prisma.case.create({
      data: {
        client_id: clients[i % clients.length].id,
        source_consultation_id: consultations[i % consultations.length].id,
        case_title: faker.lorem.words(3),
        case_type: faker.lorem.word(),
        status: CaseStatus.Open,
        created_by_user_id: users[i % users.length].id,
      },
    });
    cases.push(caseRecord);
  }

  // 5. Seed Tasks
  const tasks = [];
  for (let i = 0; i < 15; i++) {
    const task = await prisma.task.create({
      data: {
        case_id: cases[i % cases.length].id,
        title: faker.lorem.words(2),
        description: faker.lorem.sentence(),
        status: TaskStatus.Pending,
        created_by_user_id: users[i % users.length].id,
      },
    });
    tasks.push(task);
  }

  // 6. Seed Payments
  for (let i = 0; i < 10; i++) {
    await prisma.payment.create({
      data: {
        amount: faker.number.float({ min: 100, max: 1000, fractionDigits: 2 }),
        payment_date: faker.date.recent(),
        status: PaymentStatus.Paid,
        case_id: cases[i % cases.length].id,
        created_by_user_id: users[i % users.length].id,
      },
    });
  }

  console.log("✅ Seeding complete!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
