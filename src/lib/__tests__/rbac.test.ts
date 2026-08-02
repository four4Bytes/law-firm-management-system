import { describe, expect, it } from "vitest";

import { Role } from "@/generated/prisma/browser";
import {
  can,
  PERMISSION_MATRIX,
  type AccessContext,
  type AccessQualifier,
  type Permission,
} from "@/lib/rbac";

/**
 * Superset lattice over qualifiers: for adjacent roles in the documented
 * hierarchy (Dev > Admin > BranchManager > Lawyer > Paralegal > ProcessServer),
 * the higher role's qualifier must include the lower role's. Entries list
 * every qualifier the key qualifier is a superset of (including itself).
 */
const SUPERSET: Record<AccessQualifier, readonly AccessQualifier[]> = {
  yes: [
    "yes",
    "assigned-or-own",
    "assigned",
    "own",
    "assigned-task-only-or-own",
    "assigned-task-only",
    "assigned-and-own",
    "no",
  ],
  "assigned-or-own": [
    "assigned-or-own",
    "assigned",
    "own",
    "assigned-task-only-or-own",
    "assigned-task-only",
    "assigned-and-own",
    "no",
  ],
  "assigned-task-only-or-own": [
    "assigned-task-only-or-own",
    "assigned-task-only",
    "own",
    "assigned-and-own",
    "no",
  ],
  assigned: ["assigned", "assigned-task-only", "assigned-and-own", "no"],
  own: ["own", "assigned-and-own", "no"],
  "assigned-task-only": ["assigned-task-only", "no"],
  "assigned-and-own": ["assigned-and-own", "no"],
  no: ["no"],
};

const HIERARCHY: readonly Role[] = [
  Role.Dev,
  Role.Admin,
  Role.BranchManager,
  Role.Lawyer,
  Role.Paralegal,
  Role.ProcessServer,
];

const QUALIFIER_CONTEXTS: Record<Exclude<AccessQualifier, "yes" | "no">, AccessContext> = {
  assigned: { assigned: true },
  own: { own: true },
  "assigned-or-own": { own: true },
  "assigned-and-own": { assigned: true, own: true },
  "assigned-task-only": { assigned: true, taskOnly: true },
  "assigned-task-only-or-own": { own: true },
};

describe("rbac matrix", () => {
  it("evaluates every qualifier with its context", () => {
    for (const role of HIERARCHY) {
      for (const permission of Object.keys(PERMISSION_MATRIX) as Permission[]) {
        const qualifier = PERMISSION_MATRIX[permission][role];

        if (qualifier === "yes") {
          expect(can(role, permission)).toBe(true);
          expect(can(role, permission, { assigned: false, own: false })).toBe(true);
        } else if (qualifier === "no") {
          expect(can(role, permission, QUALIFIER_CONTEXTS.assigned)).toBe(false);
          expect(can(role, permission, QUALIFIER_CONTEXTS.own)).toBe(false);
          expect(can(role, permission, QUALIFIER_CONTEXTS["assigned-and-own"])).toBe(false);
        } else {
          const context = QUALIFIER_CONTEXTS[qualifier];
          expect(can(role, permission, context)).toBe(true);
          expect(can(role, permission)).toBe(false);

          // Test denial for non-satisfying contexts
          if (qualifier === "assigned") {
            expect(can(role, permission, { assigned: false, own: false })).toBe(false);
            expect(can(role, permission, { assigned: false, own: true })).toBe(false);
          } else if (qualifier === "own") {
            expect(can(role, permission, { assigned: false, own: false })).toBe(false);
            expect(can(role, permission, { assigned: true, own: false })).toBe(false);
          } else if (qualifier === "assigned-or-own") {
            expect(can(role, permission, { assigned: false, own: false })).toBe(false);
          } else if (qualifier === "assigned-and-own") {
            expect(can(role, permission, { assigned: true, own: false })).toBe(false);
            expect(can(role, permission, { assigned: false, own: true })).toBe(false);
            expect(can(role, permission, { assigned: false, own: false })).toBe(false);
          } else if (qualifier === "assigned-task-only") {
            expect(can(role, permission, { assigned: false, taskOnly: true })).toBe(false);
            expect(can(role, permission, { assigned: true, taskOnly: false })).toBe(false);
            expect(can(role, permission, { assigned: false, taskOnly: false })).toBe(false);
          } else if (qualifier === "assigned-task-only-or-own") {
            expect(can(role, permission, { assigned: false, own: false })).toBe(false);
            expect(can(role, permission, { assigned: false, taskOnly: true, own: false })).toBe(false);
            expect(can(role, permission, { assigned: true, taskOnly: false, own: false })).toBe(false);
          }
        }
      }
    }
  });

  it("keeps activity logs immutable", () => {
    expect(PERMISSION_MATRIX["activity.read"]).toEqual({
      Dev: "yes",
      Admin: "yes",
      BranchManager: "yes",
      Lawyer: "no",
      Paralegal: "no",
      ProcessServer: "no",
    });
  });

  it("restricts payments to Dev, Admin, and Branch Manager", () => {
    for (const permission of [
      "payment.create",
      "payment.read",
      "payment.update",
      "payment.delete",
    ] as const) {
      expect(PERMISSION_MATRIX[permission]).toEqual({
        Dev: "yes",
        Admin: "yes",
        BranchManager: "yes",
        Lawyer: "no",
        Paralegal: "no",
        ProcessServer: "no",
      });
    }
  });

  it("grants user reads to every role", () => {
    expect(PERMISSION_MATRIX["user.read"]).toEqual({
      Dev: "yes",
      Admin: "yes",
      BranchManager: "yes",
      Lawyer: "yes",
      Paralegal: "yes",
      ProcessServer: "yes",
    });
  });

  it("keeps higher roles at least as privileged as lower roles", () => {
    for (const permission of Object.keys(PERMISSION_MATRIX) as Permission[]) {
      for (let i = 0; i < HIERARCHY.length - 1; i += 1) {
        const higher = PERMISSION_MATRIX[permission][HIERARCHY[i]];
        const lower = PERMISSION_MATRIX[permission][HIERARCHY[i + 1]];
        expect(
          SUPERSET[higher].includes(lower),
          `${permission}: ${HIERARCHY[i]} (${higher}) must include ${HIERARCHY[i + 1]} (${lower})`,
        ).toBe(true);
      }
    }
  });

  it("rejects null or undefined roles", () => {
    expect(can(null, "case.read")).toBe(false);
    expect(can(undefined, "case.read")).toBe(false);
  });

  it("mirrors the case vs consultation attachment delete split", () => {
    expect(PERMISSION_MATRIX["attachment.delete"]).toEqual({
      Dev: "yes",
      Admin: "yes",
      BranchManager: "yes",
      Lawyer: "assigned-or-own",
      Paralegal: "own",
      ProcessServer: "own",
    });
    expect(PERMISSION_MATRIX["consultation.attachment.delete"]).toEqual({
      Dev: "yes",
      Admin: "yes",
      BranchManager: "yes",
      Lawyer: "assigned-or-own",
      Paralegal: "assigned-and-own",
      ProcessServer: "assigned-and-own",
    });
  });

  it("mirrors the case vs consultation activity read split", () => {
    expect(PERMISSION_MATRIX["case.activity.read"]).toEqual({
      Dev: "yes",
      Admin: "yes",
      BranchManager: "yes",
      Lawyer: "assigned",
      Paralegal: "assigned",
      ProcessServer: "assigned",
    });
    expect(PERMISSION_MATRIX["consultation.activity.read"]).toEqual({
      Dev: "yes",
      Admin: "yes",
      BranchManager: "yes",
      Lawyer: "assigned-or-own",
      Paralegal: "assigned",
      ProcessServer: "assigned",
    });
  });
});
