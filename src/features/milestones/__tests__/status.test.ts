import { describe, expect, it } from "vitest";

import { CaseMilestoneStatus } from "@/generated/prisma/browser";

import {
  describeMilestoneNextSteps,
  isTerminalMilestoneStatus,
  isValidMilestoneStatusTransition,
  milestoneStatusOptions,
} from "../status";

describe("isValidMilestoneStatusTransition", () => {
  it("allows Pending to conclude and terminal states to reopen", () => {
    expect(
      isValidMilestoneStatusTransition(CaseMilestoneStatus.Pending, CaseMilestoneStatus.Done),
    ).toBe(true);
    expect(
      isValidMilestoneStatusTransition(CaseMilestoneStatus.Pending, CaseMilestoneStatus.Cancelled),
    ).toBe(true);
    expect(
      isValidMilestoneStatusTransition(CaseMilestoneStatus.Done, CaseMilestoneStatus.Pending),
    ).toBe(true);
    expect(
      isValidMilestoneStatusTransition(CaseMilestoneStatus.Cancelled, CaseMilestoneStatus.Pending),
    ).toBe(true);
  });

  it("rejects sideways, backward-from-Pending, and same-status moves", () => {
    expect(
      isValidMilestoneStatusTransition(CaseMilestoneStatus.Done, CaseMilestoneStatus.Cancelled),
    ).toBe(false);
    expect(
      isValidMilestoneStatusTransition(CaseMilestoneStatus.Cancelled, CaseMilestoneStatus.Done),
    ).toBe(false);
    expect(
      isValidMilestoneStatusTransition(CaseMilestoneStatus.Pending, CaseMilestoneStatus.Pending),
    ).toBe(false);
  });
});

describe("isTerminalMilestoneStatus", () => {
  it("marks Done and Cancelled terminal", () => {
    expect(isTerminalMilestoneStatus(CaseMilestoneStatus.Done)).toBe(true);
    expect(isTerminalMilestoneStatus(CaseMilestoneStatus.Cancelled)).toBe(true);
    expect(isTerminalMilestoneStatus(CaseMilestoneStatus.Pending)).toBe(false);
  });
});

describe("milestoneStatusOptions", () => {
  it("offers the current status plus every legal target", () => {
    expect(milestoneStatusOptions(CaseMilestoneStatus.Pending)).toEqual([
      CaseMilestoneStatus.Pending,
      CaseMilestoneStatus.Done,
      CaseMilestoneStatus.Cancelled,
    ]);
    expect(milestoneStatusOptions(CaseMilestoneStatus.Done)).toEqual([
      CaseMilestoneStatus.Done,
      CaseMilestoneStatus.Pending,
    ]);
  });
});

describe("describeMilestoneNextSteps", () => {
  it("names the legal moves", () => {
    expect(describeMilestoneNextSteps(CaseMilestoneStatus.Pending)).toBe(
      "mark it done or cancel it",
    );
    expect(describeMilestoneNextSteps(CaseMilestoneStatus.Done)).toBe("reopen it");
  });
});
