"use server";

import { auth, signIn, signOut } from "@/lib/auth";

export async function loginWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function logoutUser(reason?: "deactivated"): Promise<void> {
  await signOut({
    redirectTo: reason === "deactivated" ? "/deactivated?reason=deactivated" : "/",
  });
}

export async function clearDeactivatedSession(): Promise<void> {
  const session = await auth();
  if (session?.user?.isActive === false) {
    await signOut({ redirect: false });
  }
}
