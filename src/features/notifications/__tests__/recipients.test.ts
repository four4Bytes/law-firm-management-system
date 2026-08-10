import { describe, expect, it } from "vitest";

import { diffNewAssigneeIds } from "../recipients";

describe("diffNewAssigneeIds", () => {
  it("returns only ids not already present", () => {
    expect(diffNewAssigneeIds(["a", "b", "c"], ["b"])).toEqual(["a", "c"]);
  });

  it("returns an empty array when incoming is undefined", () => {
    expect(diffNewAssigneeIds(undefined, ["b"])).toEqual([]);
  });

  it("returns an empty array when all ids already exist", () => {
    expect(diffNewAssigneeIds(["b"], ["b"])).toEqual([]);
  });
});
