import type { Role } from "@/generated/prisma/browser";

/** Time window (in ms) for determining if a user is 'online'. 2 minutes. */
export const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

export const CREATABLE_ROLES = [
  "Admin",
  "BranchManager",
  "Lawyer",
  "Paralegal",
  "ProcessServer",
] as const satisfies readonly Role[];

export const roleLabels: Record<Role, string> = {
  Dev: "Dev",
  Admin: "Admin",
  BranchManager: "Branch Manager",
  Lawyer: "Lawyer",
  Paralegal: "Paralegal",
  ProcessServer: "Process Server",
};
