import { describe, expect, it } from "vitest";

import {
  canPreviewTextInline,
  sliceTextPreview,
  TEXT_PREVIEW_MAX_BYTES,
} from "@/lib/files/text-preview";

describe("canPreviewTextInline", () => {
  it("allows files within the size limit", () => {
    expect(canPreviewTextInline(TEXT_PREVIEW_MAX_BYTES)).toBe(true);
  });

  it("rejects files over the size limit", () => {
    expect(canPreviewTextInline(TEXT_PREVIEW_MAX_BYTES + 1)).toBe(false);
  });

  it("allows an unknown size", () => {
    expect(canPreviewTextInline(null)).toBe(true);
  });
});

describe("sliceTextPreview", () => {
  it("returns short text unchanged", () => {
    expect(sliceTextPreview("hello world")).toBe("hello world");
  });

  it("truncates text over the character budget", () => {
    const result = sliceTextPreview("a".repeat(20), 10);
    expect(result).toBe(`${"a".repeat(10)}…`);
    expect(result).toHaveLength(11);
  });

  it("trims trailing whitespace before appending the ellipsis", () => {
    expect(sliceTextPreview("abc   def", 5)).toBe("abc…");
  });
});
