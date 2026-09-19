import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

interface SeedUser {
  name: string;
  email: string;
  role: Role;
  is_active?: boolean;
  /** Minutes since the last presence heartbeat. Omitted defaults to 180 (offline). */
  lastSeenMinutesAgo?: number | null;
}

const activeUsers: SeedUser[] = [
  { name: "Dev Admin", email: "dev@aninolaw.com", role: Role.Dev, lastSeenMinutesAgo: 0 },
  {
    name: "Atty. Maria Anino",
    email: "maria.anino@aninolaw.com",
    role: Role.Admin,
    lastSeenMinutesAgo: 1,
  },
  {
    name: "Atty. James Reyes",
    email: "james.reyes@aninolaw.com",
    role: Role.Admin,
    lastSeenMinutesAgo: 45,
  },
  {
    name: "Catherine Diaz",
    email: "catherine.diaz@aninolaw.com",
    role: Role.BranchManager,
    lastSeenMinutesAgo: 25,
  },
  {
    name: "Robert Santos",
    email: "robert.santos@aninolaw.com",
    role: Role.BranchManager,
    lastSeenMinutesAgo: 300,
  },
  {
    name: "Leonor Ramos",
    email: "leonor.ramos@aninolaw.com",
    role: Role.BranchManager,
    lastSeenMinutesAgo: 90,
  },
  {
    name: "Atty. Miguel Cruz",
    email: "miguel.cruz@aninolaw.com",
    role: Role.Lawyer,
    lastSeenMinutesAgo: 1,
  },
  {
    name: "Atty. Sofia Villanueva",
    email: "sofia.villanueva@aninolaw.com",
    role: Role.Lawyer,
    lastSeenMinutesAgo: 12,
  },
  {
    name: "Atty. David Tan",
    email: "david.tan@aninolaw.com",
    role: Role.Lawyer,
    lastSeenMinutesAgo: 40,
  },
  {
    name: "Atty. Angela Mercado",
    email: "angela.mercado@aninolaw.com",
    role: Role.Lawyer,
    lastSeenMinutesAgo: 60,
  },
  {
    name: "Atty. Ricardo Guevarra",
    email: "ricardo.guevarra@aninolaw.com",
    role: Role.Lawyer,
    lastSeenMinutesAgo: 500,
  },
  {
    name: "Atty. Gina Reyes",
    email: "gina.reyes@aninolaw.com",
    role: Role.Lawyer,
    lastSeenMinutesAgo: 15,
  },
  {
    name: "Atty. Marco Lopez",
    email: "marco.lopez@aninolaw.com",
    role: Role.Lawyer,
    lastSeenMinutesAgo: 5,
  },
  {
    name: "Jessica Lim",
    email: "jessica.lim@aninolaw.com",
    role: Role.Paralegal,
    lastSeenMinutesAgo: 0,
  },
  {
    name: "Kevin Garcia",
    email: "kevin.garcia@aninolaw.com",
    role: Role.Paralegal,
    lastSeenMinutesAgo: 8,
  },
  {
    name: "Nina Salvador",
    email: "nina.salvador@aninolaw.com",
    role: Role.Paralegal,
    lastSeenMinutesAgo: 130,
  },
  {
    name: "Paolo Guerrero",
    email: "paolo.guerrero@aninolaw.com",
    role: Role.Paralegal,
    lastSeenMinutesAgo: null,
  },
  {
    name: "Maya Fernandez",
    email: "maya.fernandez@aninolaw.com",
    role: Role.Paralegal,
    lastSeenMinutesAgo: 3,
  },
  {
    name: "Ramon Flores",
    email: "ramon.flores@aninolaw.com",
    role: Role.ProcessServer,
    lastSeenMinutesAgo: 200,
  },
  {
    name: "Liza Mendoza",
    email: "liza.mendoza@aninolaw.com",
    role: Role.ProcessServer,
    lastSeenMinutesAgo: 33,
  },
  {
    name: "Benito Cruz",
    email: "benito.cruz@aninolaw.com",
    role: Role.ProcessServer,
    lastSeenMinutesAgo: 700,
  },
  {
    name: "Tina Roxas",
    email: "tina.roxas@aninolaw.com",
    role: Role.ProcessServer,
    lastSeenMinutesAgo: 55,
  },
];

const inactiveUsers: SeedUser[] = [
  {
    name: "Paolo Santos",
    email: "paolo.santos@aninolaw.com",
    role: Role.Paralegal,
    is_active: false,
  },
  {
    name: "Atty. Wendy Chua",
    email: "wendy.chua@aninolaw.com",
    role: Role.Lawyer,
    is_active: false,
  },
  {
    name: "Rodel Francisco",
    email: "rodel.francisco@aninolaw.com",
    role: Role.ProcessServer,
    is_active: false,
  },
];

export async function seedUsers(): Promise<Record<string, string>> {
  const allUsers = [...activeUsers, ...inactiveUsers];
  const byEmail: Record<string, string> = {};

  for (const u of allUsers) {
    const lastSeenAt =
      u.lastSeenMinutesAgo === undefined || u.lastSeenMinutesAgo === null
        ? null
        : new Date(Date.now() - u.lastSeenMinutesAgo * 60_000);
    const user = await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        role: u.role,
        is_active: u.is_active ?? true,
        last_seen_at: lastSeenAt,
      },
    });
    byEmail[u.email] = user.id;
  }

  console.log(
    `Seeded ${allUsers.length} users (${activeUsers.length} active, ${inactiveUsers.length} inactive).`,
  );
  return byEmail;
}
