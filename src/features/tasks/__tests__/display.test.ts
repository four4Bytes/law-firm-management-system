import { describe, expect, it } from "vitest";

import { ReviewDecision, TaskAssignmentStatus } from "@/generated/prisma/browser";

import {
  resolveAssigneeDisplayRows,
  resolveReviewerDisplayRows,
  withLockedReviewer,
} from "../display";

const users = [
  { id: "user-1", name: "Alice", is_online: true },
  { id: "user-2", name: "Bob", is_online: false },
  { id: "user-3", name: "Cara", is_online: true },
];

describe("resolveAssigneeDisplayRows", () => {
  it("resolves saved statuses for live-selected assignees", () => {
    const rows = resolveAssigneeDisplayRows({
      users,
      selectedIds: new Set(["user-1", "user-2"]),
      snapshot: [
        { id: "user-1", name: "Alice", status: TaskAssignmentStatus.Done },
        { id: "user-2", name: "Bob", status: TaskAssignmentStatus.Todo },
      ],
    });

    expect(rows).toEqual([
      { id: "user-1", name: "Alice", status: "Done", is_online: true },
      { id: "user-2", name: "Bob", status: "Todo", is_online: false },
    ]);
  });

  it("defaults newly added assignees to Todo so the list updates immediately", () => {
    const rows = resolveAssigneeDisplayRows({
      users,
      selectedIds: new Set(["user-1", "user-3"]),
      snapshot: [{ id: "user-1", name: "Alice", status: TaskAssignmentStatus.Done }],
    });

    expect(rows).toEqual([
      { id: "user-1", name: "Alice", status: "Done", is_online: true },
      { id: "user-3", name: "Cara", status: "Todo", is_online: true },
    ]);
  });

  it("drops deselected assignees and ignores unknown ids", () => {
    const rows = resolveAssigneeDisplayRows({
      users,
      selectedIds: new Set(["user-2", "user-unknown"]),
      snapshot: [
        { id: "user-1", name: "Alice", status: TaskAssignmentStatus.Done },
        { id: "user-2", name: "Bob", status: TaskAssignmentStatus.Todo },
      ],
    });

    expect(rows).toEqual([{ id: "user-2", name: "Bob", status: "Todo", is_online: false }]);
  });

  it("keeps selected members missing from the directory using snapshot names", () => {
    const rows = resolveAssigneeDisplayRows({
      users: users.slice(0, 2),
      selectedIds: new Set(["user-2", "user-3"]),
      snapshot: [
        { id: "user-2", name: "Bob", status: TaskAssignmentStatus.Todo },
        { id: "user-3", name: "Cara", status: TaskAssignmentStatus.Done },
      ],
    });

    expect(rows).toEqual([
      { id: "user-2", name: "Bob", status: "Todo", is_online: false },
      { id: "user-3", name: "Cara", status: "Done", is_online: false },
    ]);
  });

  it("returns an empty list when nothing is selected", () => {
    const rows = resolveAssigneeDisplayRows({
      users,
      selectedIds: new Set(),
      snapshot: [{ id: "user-1", name: "Alice", status: TaskAssignmentStatus.Done }],
    });

    expect(rows).toEqual([]);
  });
});

describe("resolveReviewerDisplayRows", () => {
  it("resolves saved decisions for live-selected reviewers", () => {
    const rows = resolveReviewerDisplayRows({
      users,
      selectedIds: new Set(["user-1", "user-2"]),
      snapshot: [
        { reviewer_user_id: "user-1", name: "Alice", decision: ReviewDecision.Approved },
        { reviewer_user_id: "user-2", name: "Bob", decision: ReviewDecision.Pending },
      ],
      createdByUserId: "user-9",
    });

    expect(rows).toEqual([
      { id: "user-1", name: "Alice", status: "Approved", is_online: true },
      { id: "user-2", name: "Bob", status: "Pending", is_online: false },
    ]);
  });

  it("defaults newly added reviewers to Pending and marks the creator", () => {
    const rows = resolveReviewerDisplayRows({
      users,
      selectedIds: new Set(["user-1", "user-3"]),
      snapshot: [{ reviewer_user_id: "user-1", name: "Alice", decision: ReviewDecision.Rejected }],
      createdByUserId: "user-3",
    });

    expect(rows).toEqual([
      { id: "user-1", name: "Alice", status: "Rejected", is_online: true },
      { id: "user-3", name: "Cara (creator)", status: "Pending", is_online: true },
    ]);
  });

  it("drops deselected reviewers and ignores unknown ids", () => {
    const rows = resolveReviewerDisplayRows({
      users,
      selectedIds: new Set(["user-2", "user-unknown"]),
      snapshot: [
        { reviewer_user_id: "user-1", name: "Alice", decision: ReviewDecision.Approved },
        { reviewer_user_id: "user-2", name: "Bob", decision: ReviewDecision.Pending },
      ],
    });

    expect(rows).toEqual([{ id: "user-2", name: "Bob", status: "Pending", is_online: false }]);
  });

  it("keeps selected reviewers missing from the directory using snapshot names", () => {
    const rows = resolveReviewerDisplayRows({
      users: users.slice(0, 2),
      selectedIds: new Set(["user-2", "user-3"]),
      snapshot: [
        { reviewer_user_id: "user-2", name: "Bob", decision: ReviewDecision.Pending },
        { reviewer_user_id: "user-3", name: "Cara", decision: ReviewDecision.Approved },
      ],
      createdByUserId: "user-3",
    });

    expect(rows).toEqual([
      { id: "user-2", name: "Bob", status: "Pending", is_online: false },
      { id: "user-3", name: "Cara (creator)", status: "Approved", is_online: false },
    ]);
  });

  it("returns an empty list when nothing is selected", () => {
    const rows = resolveReviewerDisplayRows({
      users,
      selectedIds: new Set(),
      snapshot: [{ reviewer_user_id: "user-1", name: "Alice", decision: ReviewDecision.Approved }],
    });

    expect(rows).toEqual([]);
  });
});

describe("withLockedReviewer", () => {
  it("re-adds the creator when a toggle drops them", () => {
    expect(withLockedReviewer(new Set(["user-2"]), "user-1")).toEqual(
      new Set(["user-2", "user-1"]),
    );
  });

  it("returns the same set when the creator is already present", () => {
    const ids = new Set(["user-1", "user-2"]);
    expect(withLockedReviewer(ids, "user-1")).toBe(ids);
  });

  it("locks the creator into an empty selection", () => {
    expect(withLockedReviewer(new Set(), "user-1")).toEqual(new Set(["user-1"]));
  });
});
