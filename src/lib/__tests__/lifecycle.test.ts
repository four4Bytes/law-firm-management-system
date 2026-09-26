import { describe, expect, it } from "vitest";

import { CaseStatus, ConsultationStatus } from "@/generated/prisma/browser";
import {
  canTransition,
  CASE_TRANSITIONS,
  CONSULTATION_TRANSITIONS,
  isTerminalStatus,
} from "@/lib/domain/lifecycle";

describe("canTransition", () => {
  it("allows consultation edges", () => {
    expect(
      canTransition(
        CONSULTATION_TRANSITIONS,
        ConsultationStatus.Scheduled,
        ConsultationStatus.Completed,
      ),
    ).toBe(true);
    expect(
      canTransition(
        CONSULTATION_TRANSITIONS,
        ConsultationStatus.Cancelled,
        ConsultationStatus.Scheduled,
      ),
    ).toBe(true);
  });

  it("rejects reverse, sideways, and same-status moves", () => {
    expect(
      canTransition(
        CONSULTATION_TRANSITIONS,
        ConsultationStatus.Completed,
        ConsultationStatus.Scheduled,
      ),
    ).toBe(false);
    expect(canTransition(CASE_TRANSITIONS, CaseStatus.Closed, CaseStatus.Settled)).toBe(false);
    expect(canTransition(CASE_TRANSITIONS, CaseStatus.Open, CaseStatus.Open)).toBe(false);
  });

  it("allows case conclusion and reopen edges", () => {
    expect(canTransition(CASE_TRANSITIONS, CaseStatus.Open, CaseStatus.Closed)).toBe(true);
    expect(canTransition(CASE_TRANSITIONS, CaseStatus.Settled, CaseStatus.Open)).toBe(true);
  });
});

describe("isTerminalStatus", () => {
  it("derives terminality from outgoing edges", () => {
    expect(isTerminalStatus(CONSULTATION_TRANSITIONS, ConsultationStatus.Accepted)).toBe(true);
    expect(isTerminalStatus(CONSULTATION_TRANSITIONS, ConsultationStatus.Rejected)).toBe(true);
    expect(isTerminalStatus(CONSULTATION_TRANSITIONS, ConsultationStatus.Scheduled)).toBe(false);
    expect(isTerminalStatus(CONSULTATION_TRANSITIONS, ConsultationStatus.Cancelled)).toBe(false);
    expect(isTerminalStatus(CASE_TRANSITIONS, CaseStatus.Open)).toBe(false);
  });
});
