"use server";

import { signIn, signOut } from "@/lib/auth";

export async function loginWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function logoutUser(reason?: "deactivated"): Promise<void> {
  await signOut({
    redirectTo: reason === "deactivated" ? "/deactivated?reason=deactivated" : "/",
  });
}
