import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { upsertDeveloperUser } from "@/features/users/mutations";
import { getUserByEmail } from "@/features/users/queries";
import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { parseDeveloperEmails } from "@/util/env-parser";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  session: {
    strategy: "jwt",
  },
  pages: {
    error: "/auth/error",
  },
  debug: true,

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !profile?.email_verified || !user.email) {
        return false;
      }

      const developerWhitelist = parseDeveloperEmails();

      // Get email and existing user
      const email = user.email;
      const existingUser = await getUserByEmail(email);

      if (developerWhitelist.includes(email)) {
        await upsertDeveloperUser(email, user.name ?? "Developer Account");
        return true;
      }

      if (!existingUser || !existingUser.is_active) {
        return false;
      }

      // The environment variable was removed, but a developer tries to log in.
      if (existingUser.role === Role.Dev) {
        return false;
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user && token.email) {
        const dbUser = await getUserByEmail(token.email);
        if (dbUser) {
          token.role = dbUser.role;
          token.id = dbUser.id;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.role = token.role ?? null;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
