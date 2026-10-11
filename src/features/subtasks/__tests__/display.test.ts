import { describe, expect, it } from "vitest";

import { SubtaskStatus } from "@/generated/prisma/browser";

import { getSubtaskStatusLabel, getSubtaskStatusVariant, isSubtaskOverdue } from "../display";

describe("getSubtaskStatusLabel", () => {
  it.each([
    [SubtaskStatus.Pending, "To Do"],
    [SubtaskStatus.InProgress, "In Progress"],
    [SubtaskStatus.Done, "Done"],
  ])("maps %s to %s", (status, label) => {
    expect(getSubtaskStatusLabel(status)).toBe(label);
  });
});

describe("getSubtaskStatusVariant", () => {
  it.each([
    [SubtaskStatus.Pending, "pending"],
    [SubtaskStatus.InProgress, "info"],
    [SubtaskStatus.Done, "done"],
  ] as const)("maps %s to %s", (status, variant) => {
    expect(getSubtaskStatusVariant(status)).toBe(variant);
  });
});

describe("isSubtaskOverdue", () => {
  it("returns true for a past-due pending subtask", () => {
    expect(
      isSubtaskOverdue({
        due_date: new Date("2020-01-01T09:00:00+08:00"),
        status: SubtaskStatus.Pending,
      }),
    ).toBe(true);
  });

  it("returns false for a future-due pending subtask", () => {
    expect(
      isSubtaskOverdue({
        due_date: new Date("2099-01-01T09:00:00+08:00"),
        status: SubtaskStatus.Pending,
      }),
    ).toBe(false);
  });

  it("returns false for a Done subtask with a past due date", () => {
    expect(
      isSubtaskOverdue({
        due_date: new Date("2020-01-01T09:00:00+08:00"),
        status: SubtaskStatus.Done,
      }),
    ).toBe(false);
  });
});
