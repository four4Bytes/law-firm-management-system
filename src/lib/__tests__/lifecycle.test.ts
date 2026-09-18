import { describe, expect, it } from "vitest";

import { CaseStatus, ConsultationStatus, TaskStatus } from "@/generated/prisma/browser";
import {
  canTransition,
  CASE_TRANSITIONS,
  CONSULTATION_TRANSITIONS,
  isSubdataLocked,
  isTerminalStatus,
} from "@/lib/lifecycle";

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

describe("isSubdataLocked", () => {
  it("locks terminal consultations", () => {
    expect(isSubdataLocked("consultation", ConsultationStatus.Accepted)).toBe(true);
    expect(isSubdataLocked("consultation", ConsultationStatus.Rejected)).toBe(true);
    expect(isSubdataLocked("consultation", ConsultationStatus.Cancelled)).toBe(true);
    expect(isSubdataLocked("consultation", ConsultationStatus.Scheduled)).toBe(false);
    expect(isSubdataLocked("consultation", ConsultationStatus.Completed)).toBe(false);
  });

  it("locks terminal cases", () => {
    expect(isSubdataLocked("case", CaseStatus.Closed)).toBe(true);
    expect(isSubdataLocked("case", CaseStatus.Settled)).toBe(true);
    expect(isSubdataLocked("case", CaseStatus.Terminated)).toBe(true);
    expect(isSubdataLocked("case", CaseStatus.Open)).toBe(false);
  });

  it("locks done tasks", () => {
    expect(isSubdataLocked("task", TaskStatus.Done)).toBe(true);
    expect(isSubdataLocked("task", TaskStatus.Pending)).toBe(false);
    expect(isSubdataLocked("task", TaskStatus.InReview)).toBe(false);
  });
});
