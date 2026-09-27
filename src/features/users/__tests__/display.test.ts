import { describe, expect, it } from "vitest";

import { mergeMissingUsers } from "../display";

const directory = [
  { id: "user-1", name: "Alice", is_online: true },
  { id: "user-2", name: "Bob", is_online: false },
];

describe("mergeMissingUsers", () => {
  it("returns the directory unchanged when no selected user is missing", () => {
    const result = mergeMissingUsers({
      directory,
      selectedIds: new Set(["user-1"]),
      snapshot: [{ id: "user-1", name: "Alice" }],
    });

    expect(result).toEqual(directory);
  });

  it("appends selected users absent from the directory as offline", () => {
    const result = mergeMissingUsers({
      directory,
      selectedIds: new Set(["user-1", "user-9"]),
      snapshot: [{ id: "user-9", name: "Retired" }],
    });

    expect(result).toEqual([...directory, { id: "user-9", name: "Retired", is_online: false }]);
  });

  it("omits snapshot users that are not selected", () => {
    const result = mergeMissingUsers({
      directory,
      selectedIds: new Set(["user-1"]),
      snapshot: [{ id: "user-9", name: "Retired" }],
    });

    expect(result).toEqual(directory);
  });

  it("does not duplicate a snapshot user already in the directory", () => {
    const result = mergeMissingUsers({
      directory,
      selectedIds: new Set(["user-1", "user-2"]),
      snapshot: [
        { id: "user-1", name: "Stale Name" },
        { id: "user-2", name: "Bob" },
      ],
    });

    expect(result).toEqual(directory);
  });

  it("returns an empty directory with only the missing selected user", () => {
    const result = mergeMissingUsers({
      directory: [],
      selectedIds: new Set(["user-9"]),
      snapshot: [{ id: "user-9", name: "Retired" }],
    });

    expect(result).toEqual([{ id: "user-9", name: "Retired", is_online: false }]);
  });
});
