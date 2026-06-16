import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { syncUserFromGoogle, upsertDeveloperUser } from "@/features/users/mutations";
import { getUserByEmail } from "@/features/users/queries";
import { isDeveloperEmail } from "@/lib/developer-emails";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      // Bypasses the OAuthAccountNotLinked block dynamically in both dev and prod environment
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    error: "/auth/error",
  },
  // Enable debug only on development
  debug: process.env.NODE_ENV === "development",

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !profile?.email_verified || !user.email) {
        return false;
      }

      const email = user.email;
      const existingUser = await getUserByEmail(email);

      if (isDeveloperEmail(email)) {
        if (existingUser && !existingUser.is_active) {
          return false;
        }
        await upsertDeveloperUser(email, user.name ?? "Developer Account", user.image);
        return true;
      }

      if (!existingUser || !existingUser.is_active) {
        return false;
      }

      await syncUserFromGoogle(email, user.name ?? email, user.image);

      return true;
    },

    async jwt({ token }) {
      if (token.email) {
        const dbUser = await getUserByEmail(token.email);
        if (!dbUser || !dbUser.is_active) {
          return null;
        }
        token.role = dbUser.role;
        token.id = dbUser.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.role = token.role ?? null;
        session.user.id = token.id as string;
        session.user.image = token.picture as string | null;
      }
      return session;
    },
  },
});
