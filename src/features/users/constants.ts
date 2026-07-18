import type { Role } from "@/generated/prisma/client";

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
