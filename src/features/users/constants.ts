import type { Role } from "@/generated/prisma/client";

export const CREATABLE_ROLES: Role[] = [
  "Admin",
  "BranchManager",
  "Lawyer",
  "Paralegal",
  "ProcessServer",
];

export const roleLabels: Record<Role, string> = {
  Dev: "Dev",
  Admin: "Admin",
  BranchManager: "Branch Manager",
  Lawyer: "Lawyer",
  Paralegal: "Paralegal",
  ProcessServer: "Process Server",
};

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role | null;
  is_active: boolean;
  created_at: Date;
}
