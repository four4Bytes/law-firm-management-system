"use client";

import { useEffect } from "react";

import { clearDeactivatedSession } from "@/features/auth/actions";

export function DeactivatedSignOut() {
  useEffect(() => {
    async function clearSession() {
      await clearDeactivatedSession();
    }
    void clearSession();
  }, []);

  return null;
}
