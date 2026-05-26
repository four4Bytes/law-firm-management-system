"use server";

import { signIn } from "@/lib/auth";

export async function loginWithGoogle() {
  await signIn("google", { redirectTo: "/dashboard" });
}
