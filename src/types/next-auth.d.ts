import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

import { Role } from "@/generated/prisma/client";

declare module "next-auth" {
  // Extends the built-in session.user object to include our custom database fields.
  interface Session {
    user: {
      id: string;
      role: Role | null;
    } & DefaultSession["user"];
  }

  // Extends the built-in User object returned during authentication hooks.
  interface User extends DefaultUser {
    role?: Role | null;
  }
}

declare module "next-auth/jwt" {
  // Extends the built-in JWT token interface so TypeScript recognizes custom fields.
  interface JWT extends DefaultJWT {
    id?: string;
    role?: Role | null;
  }
}
