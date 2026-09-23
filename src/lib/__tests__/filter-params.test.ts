import { describe, expect, it } from "vitest";

import {
  filterValuesToSearchParams,
  searchParamsToFilterValues,
  withFilterValues,
} from "@/lib/primitives/filter-params";

const allowlists = [
  { key: "status", options: [{ value: "Open" }, { value: "Settled" }] },
  { key: "role", options: [{ value: "Lawyer" }, { value: "Admin" }] },
];

describe("filterValuesToSearchParams", () => {
  it("encodes selections with repeated keys", () => {
    const params = filterValuesToSearchParams({ status: ["Open", "Settled"] });
    expect(params.getAll("status")).toEqual(["Open", "Settled"]);
  });

  it("omits empty selections", () => {
    const params = filterValuesToSearchParams({ status: [], role: ["Lawyer"] });
    expect(params.has("status")).toBe(false);
    expect(params.getAll("role")).toEqual(["Lawyer"]);
  });

  it("encodes an empty value set as empty params", () => {
    expect(filterValuesToSearchParams({}).toString()).toBe("");
  });
});

describe("searchParamsToFilterValues", () => {
  it("parses repeated keys into selections", () => {
    const params = new URLSearchParams("status=Open&status=Settled");
    expect(searchParamsToFilterValues(params, allowlists)).toEqual({
      status: ["Open", "Settled"],
    });
  });

  it("drops unknown values instead of failing", () => {
    const params = new URLSearchParams("status=Open&status=Bogus");
    expect(searchParamsToFilterValues(params, allowlists)).toEqual({ status: ["Open"] });
  });

  it("collapses repeated keys into unique values", () => {
    const params = new URLSearchParams("status=Open&status=Open&status=Settled");
    expect(searchParamsToFilterValues(params, allowlists)).toEqual({
      status: ["Open", "Settled"],
    });
  });

  it("ignores params outside the allowlists", () => {
    const params = new URLSearchParams("status=Open&tab=milestones");
    expect(searchParamsToFilterValues(params, allowlists)).toEqual({ status: ["Open"] });
  });

  it("parses missing params as no filters", () => {
    expect(searchParamsToFilterValues(new URLSearchParams(), allowlists)).toEqual({});
  });
});

describe("withFilterValues", () => {
  it("replaces filter keys while preserving unrelated params", () => {
    const current = new URLSearchParams("status=Open&tab=milestones");
    const next = withFilterValues(current, { status: ["Settled"] }, allowlists);
    expect(next.getAll("status")).toEqual(["Settled"]);
    expect(next.get("tab")).toBe("milestones");
  });

  it("removes filter keys when cleared", () => {
    const current = new URLSearchParams("status=Open&tab=milestones");
    const next = withFilterValues(current, {}, allowlists);
    expect(next.has("status")).toBe(false);
    expect(next.get("tab")).toBe("milestones");
  });

  it("does not mutate the input params", () => {
    const current = new URLSearchParams("status=Open");
    withFilterValues(current, { status: ["Settled"] }, allowlists);
    expect(current.getAll("status")).toEqual(["Open"]);
  });
});
