import { ConsultationStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

interface ConsultationData {
  clientEmail: string;
  createdByEmail: string;
  concern: string;
  status: ConsultationStatus;
  daysAgo: number;
}

const consultations: ConsultationData[] = [
  {
    clientEmail: "antonio.lopez@email.com",
    createdByEmail: "jessica.lim@aninolaw.com",
    concern:
      "Boundary dispute with neighboring property owner — encroachment on northern lot boundary",
    status: "Scheduled",
    daysAgo: -3,
  },
  {
    clientEmail: "patricia.luna@email.com",
    createdByEmail: "kevin.garcia@aninolaw.com",
    concern: "Medical malpractice — post-surgical complications from a routine appendectomy",
    status: "Scheduled",
    daysAgo: -2,
  },
  {
    clientEmail: "luisito.ramos@email.com",
    createdByEmail: "catherine.diaz@aninolaw.com",
    concern: "Land title verification and transfer for inherited agricultural lot in Batangas",
    status: "Scheduled",
    daysAgo: -14,
  },
  {
    clientEmail: "aileen.castro@email.com",
    createdByEmail: "maya.fernandez@aninolaw.com",
    concern: "Review of business loan agreement with BDO — unclear default provisions",
    status: "Scheduled",
    daysAgo: -5,
  },
  {
    clientEmail: "roberto.hernandez@email.com",
    createdByEmail: "paolo.guerrero@aninolaw.com",
    concern: "Property tax reassessment — assessed value doubled, seeking legal remedy",
    status: "Completed",
    daysAgo: 14,
  },
  {
    clientEmail: "catherine.santos@email.com",
    createdByEmail: "jessica.lim@aninolaw.com",
    concern: "Foreclosure notice from BPI — three months behind on mortgage payments",
    status: "Completed",
    daysAgo: 10,
  },
  {
    clientEmail: "jean.garcia@email.com",
    createdByEmail: "sofia.villanueva@aninolaw.com",
    concern:
      "Student suspension case — son expelled over alleged cheating with insufficient evidence",
    status: "Completed",
    daysAgo: 7,
  },
  {
    clientEmail: "mercedes.alvarez@email.com",
    createdByEmail: "kevin.garcia@aninolaw.com",
    concern: "Estate planning — preparation of last will and testament for blended family",
    status: "Completed",
    daysAgo: 21,
  },
  {
    clientEmail: "juan.delacruz@email.com",
    createdByEmail: "david.tan@aninolaw.com",
    concern:
      "Property acquisition — purchasing a residential lot in Nuvali, need contract review and transfer",
    status: "Accepted",
    daysAgo: 30,
  },
  {
    clientEmail: "maria.gonzales@email.com",
    createdByEmail: "sofia.villanueva@aninolaw.com",
    concern:
      "Legal separation — married 12 years, husband abandoned the family, seeking custody and support",
    status: "Accepted",
    daysAgo: 25,
  },
  {
    clientEmail: "carlos.reyes@email.com",
    createdByEmail: "miguel.cruz@aninolaw.com",
    concern:
      "Breach of contract — San Miguel Logistics failed to deliver goods per 6-month supply agreement",
    status: "Accepted",
    daysAgo: 20,
  },
  {
    clientEmail: "fatima.alcantara@email.com",
    createdByEmail: "sofia.villanueva@aninolaw.com",
    concern: "Annulment — married 5 years, psychological incapacity, seeking to void marriage",
    status: "Accepted",
    daysAgo: 18,
  },
  {
    clientEmail: "miguel.navarro@email.com",
    createdByEmail: "david.tan@aninolaw.com",
    concern:
      "Real estate joint venture — partnering with foreign investor for condominium development in BGC",
    status: "Accepted",
    daysAgo: 60,
  },
  {
    clientEmail: "gregorio.santiago@email.com",
    createdByEmail: "robert.santos@aninolaw.com",
    concern:
      "Zoning variance — Calamba property reclassified from residential to commercial, appeal needed",
    status: "Accepted",
    daysAgo: 15,
  },
  {
    clientEmail: "victorino.rivera@email.com",
    createdByEmail: "jessica.lim@aninolaw.com",
    concern:
      "Harassment suit against neighbor over drainage dispute — neighbor filed baseless criminal complaint",
    status: "Rejected",
    daysAgo: 5,
  },
  {
    clientEmail: "hernando.cruz@email.com",
    createdByEmail: "marco.lopez@aninolaw.com",
    concern: "Unlawful detainer — tenant refuses to vacate commercial space despite expired lease",
    status: "Rejected",
    daysAgo: 3,
  },
  {
    clientEmail: "rowena.lim@email.com",
    createdByEmail: "maya.fernandez@aninolaw.com",
    concern:
      "Commercial lease dispute — landlord demanding double rent citing automatic renewal clause",
    status: "Cancelled",
    daysAgo: 8,
  },
  {
    clientEmail: "emmanuel.velasco@email.com",
    createdByEmail: "kevin.garcia@aninolaw.com",
    concern:
      "Data privacy complaint — former employer shared personal data without consent after resignation",
    status: "Cancelled",
    daysAgo: 12,
  },
];

export async function seedConsultations(
  userByEmail: Record<string, string>,
  clients: { id: string; email: string }[],
): Promise<{ id: string; status: string }[]> {
  const clientByEmail = Object.fromEntries(clients.map((c) => [c.email, c.id]));
  const created: { id: string; status: string }[] = [];

  for (const c of consultations) {
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() - c.daysAgo);

    const consultation = await prisma.consultation.create({
      data: {
        client_id: clientByEmail[c.clientEmail],
        created_by_user_id: userByEmail[c.createdByEmail],
        booking_datetime: bookingDate,
        concern: c.concern,
        status: c.status,
      },
    });
    created.push({ id: consultation.id, status: c.status });
  }

  console.log(`Seeded ${created.length} consultations.`);
  return created;
}
