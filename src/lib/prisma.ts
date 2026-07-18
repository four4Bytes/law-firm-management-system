import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getRequiredEnvVar } from "@/lib/env";

/**
 * Prisma client singleton.
 *
 * `PrismaClient` (and the `DATABASE_URL` lookup) are constructed lazily on the
 * first property access, not at module import. `PrismaAdapter` only binds
 * method closures, so the deferred client is safe to pass at build time when
 * `.env` has not yet been loaded into `process.env`. The constructed instance
 * is cached on `globalThis` to survive Next.js hot reloads without leaking
 * connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Builds and returns the singleton `PrismaClient` backed by the pg adapter.
 *
 * @returns The singleton PrismaClient instance with the postgres adapter.
 */
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: getRequiredEnvVar("DATABASE_URL") }),
  });
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient());
    return Reflect.get(client, prop, receiver);
  },
});
