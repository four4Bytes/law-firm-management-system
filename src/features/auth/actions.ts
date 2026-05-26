"use server";

import { signIn, signOut } from "@/lib/auth";

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function logoutUser() {
  await signOut({ redirectTo: "/" });
}
