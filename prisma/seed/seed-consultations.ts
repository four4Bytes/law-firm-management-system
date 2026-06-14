import { ConsultationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

interface SeedConsultation {
  id: string;
  clientId: string;
  creatorEmail: string;
  booking_datetime: Date;
  concern: string;
  status: ConsultationStatus;
}

const consultations: SeedConsultation[] = [
  {
    id: "d0000000-0000-4000-a000-000000000001",
    clientId: "c0000000-0000-4000-a000-000000000001",
    creatorEmail: "alice@lawfirm.com",
    booking_datetime: new Date("2026-01-15T09:00:00Z"),
    concern: "Property boundary dispute with neighbor",
    status: ConsultationStatus.Completed,
  },
  {
    id: "d0000000-0000-4000-a000-000000000002",
    clientId: "c0000000-0000-4000-a000-000000000002",
    creatorEmail: "bob@lawfirm.com",
    booking_datetime: new Date("2026-01-20T14:00:00Z"),
    concern: "Contract review for business acquisition",
    status: ConsultationStatus.Completed,
  },
  {
    id: "d0000000-0000-4000-a000-000000000003",
    clientId: "c0000000-0000-4000-a000-000000000003",
    creatorEmail: "carol@lawfirm.com",
    booking_datetime: new Date("2026-02-01T10:00:00Z"),
    concern: "Employment dispute with former executive",
    status: ConsultationStatus.Accepted,
  },
  {
    id: "d0000000-0000-4000-a000-000000000004",
    clientId: "c0000000-0000-4000-a000-000000000004",
    creatorEmail: "dan@lawfirm.com",
    booking_datetime: new Date("2026-02-05T11:30:00Z"),
    concern: "Family business succession planning",
    status: ConsultationStatus.Accepted,
  },
  {
    id: "d0000000-0000-4000-a000-000000000005",
    clientId: "c0000000-0000-4000-a000-000000000005",
    creatorEmail: "eve@lawfirm.com",
    booking_datetime: new Date("2026-02-10T15:00:00Z"),
    concern: "Partnership dissolution advice",
    status: ConsultationStatus.Scheduled,
  },
  {
    id: "d0000000-0000-4000-a000-000000000006",
    clientId: "c0000000-0000-4000-a000-000000000006",
    creatorEmail: "frank@lawfirm.com",
    booking_datetime: new Date("2026-06-12T08:00:00Z"),
    concern: "Personal injury claim consultation",
    status: ConsultationStatus.Scheduled,
  },
  {
    id: "d0000000-0000-4000-a000-000000000007",
    clientId: "c0000000-0000-4000-a000-000000000007",
    creatorEmail: "grace.lawyer@lawfirm.com",
    booking_datetime: new Date("2026-03-01T13:00:00Z"),
    concern: "Intellectual property infringement assessment",
    status: ConsultationStatus.Completed,
  },
  {
    id: "d0000000-0000-4000-a000-000000000008",
    clientId: "c0000000-0000-4000-a000-000000000008",
    creatorEmail: "henry@lawfirm.com",
    booking_datetime: new Date("2026-03-05T09:30:00Z"),
    concern: "Divorce and child custody consultation",
    status: ConsultationStatus.Accepted,
  },
  {
    id: "d0000000-0000-4000-a000-000000000009",
    clientId: "c0000000-0000-4000-a000-000000000009",
    creatorEmail: "iris@lawfirm.com",
    booking_datetime: new Date("2026-06-20T16:00:00Z"),
    concern: "Commercial lease dispute",
    status: ConsultationStatus.Scheduled,
  },
  {
    id: "d0000000-0000-4000-a000-000000000010",
    clientId: "c0000000-0000-4000-a000-000000000010",
    creatorEmail: "jack.lawyer@lawfirm.com",
    booking_datetime: new Date("2026-03-15T11:00:00Z"),
    concern: "Debt collection legal options",
    status: ConsultationStatus.Rejected,
  },
  {
    id: "d0000000-0000-4000-a000-000000000011",
    clientId: "c0000000-0000-4000-a000-000000000011",
    creatorEmail: "kate@lawfirm.com",
    booking_datetime: new Date("2026-03-20T10:00:00Z"),
    concern: "Real estate purchase agreement review",
    status: ConsultationStatus.Completed,
  },
  {
    id: "d0000000-0000-4000-a000-000000000012",
    clientId: "c0000000-0000-4000-a000-000000000012",
    creatorEmail: "alice@lawfirm.com",
    booking_datetime: new Date("2026-04-01T14:30:00Z"),
    concern: "Medical malpractice preliminary review",
    status: ConsultationStatus.Scheduled,
  },
  {
    id: "d0000000-0000-4000-a000-000000000013",
    clientId: "c0000000-0000-4000-a000-000000000013",
    creatorEmail: "bob@lawfirm.com",
    booking_datetime: new Date("2026-04-05T09:00:00Z"),
    concern: "Corporate restructuring legal advice",
    status: ConsultationStatus.Accepted,
  },
  {
    id: "d0000000-0000-4000-a000-000000000014",
    clientId: "c0000000-0000-4000-a000-000000000014",
    creatorEmail: "carol@lawfirm.com",
    booking_datetime: new Date("2026-04-10T15:00:00Z"),
    concern: "Will and estate planning",
    status: ConsultationStatus.Completed,
  },
  {
    id: "d0000000-0000-4000-a000-000000000015",
    clientId: "c0000000-0000-4000-a000-000000000015",
    creatorEmail: "dan@lawfirm.com",
    booking_datetime: new Date("2026-04-15T11:00:00Z"),
    concern: "LLC formation consultation",
    status: ConsultationStatus.Cancelled,
  },
  {
    id: "d0000000-0000-4000-a000-000000000016",
    clientId: "c0000000-0000-4000-a000-000000000001",
    creatorEmail: "eve@lawfirm.com",
    booking_datetime: new Date("2026-06-25T13:00:00Z"),
    concern: "Appeal options for property case",
    status: ConsultationStatus.Scheduled,
  },
  {
    id: "d0000000-0000-4000-a000-000000000017",
    clientId: "c0000000-0000-4000-a000-000000000003",
    creatorEmail: "frank@lawfirm.com",
    booking_datetime: new Date("2026-05-01T10:30:00Z"),
    concern: "Labor law compliance review",
    status: ConsultationStatus.Completed,
  },
  {
    id: "d0000000-0000-4000-a000-000000000018",
    clientId: "c0000000-0000-4000-a000-000000000006",
    creatorEmail: "grace.lawyer@lawfirm.com",
    booking_datetime: new Date("2026-05-05T14:00:00Z"),
    concern: "Insurance claim dispute",
    status: ConsultationStatus.Rejected,
  },
  {
    id: "d0000000-0000-4000-a000-000000000019",
    clientId: "c0000000-0000-4000-a000-000000000009",
    creatorEmail: "henry@lawfirm.com",
    booking_datetime: new Date("2026-05-10T09:00:00Z"),
    concern: "Merger due diligence consultation",
    status: ConsultationStatus.Cancelled,
  },
  {
    id: "d0000000-0000-4000-a000-000000000020",
    clientId: "c0000000-0000-4000-a000-000000000012",
    creatorEmail: "iris@lawfirm.com",
    booking_datetime: new Date("2026-07-01T11:00:00Z"),
    concern: "Tenant rights consultation",
    status: ConsultationStatus.Scheduled,
  },
];

export async function seedConsultations() {
  let count = 0;

  for (const c of consultations) {
    await prisma.consultation.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        client: { connect: { id: c.clientId } },
        createdBy: { connect: { email: c.creatorEmail } },
        booking_datetime: c.booking_datetime,
        concern: c.concern,
        status: c.status,
      },
    });
    count++;
  }

  console.log(`Seeded ${count} consultations.`);
}
