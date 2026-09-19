import { describe, expect, it } from "vitest";

import { appendPage } from "@/lib/pagination";

describe("appendPage", () => {
  it("appends fresh rows preserving order", () => {
    const prev = [{ id: "1" }, { id: "2" }];

    expect(appendPage(prev, [{ id: "3" }, { id: "4" }])).toEqual([
      { id: "1" },
      { id: "2" },
      { id: "3" },
      { id: "4" },
    ]);
  });

  it("drops rows whose id is already present", () => {
    const prev = [{ id: "1" }, { id: "2" }];

    expect(appendPage(prev, [{ id: "2" }, { id: "3" }])).toEqual([
      { id: "1" },
      { id: "2" },
      { id: "3" },
    ]);
  });

  it("drops duplicate ids within the fetched page itself", () => {
    expect(appendPage([{ id: "1" }], [{ id: "2" }, { id: "2" }, { id: "3" }])).toEqual([
      { id: "1" },
      { id: "2" },
      { id: "3" },
    ]);
  });

  it("returns prev unchanged when the page adds nothing new", () => {
    const prev = [{ id: "1" }];

    expect(appendPage(prev, [])).toEqual([{ id: "1" }]);
    expect(appendPage(prev, [{ id: "1" }])).toEqual([{ id: "1" }]);
  });
});
