import { describe, expect, it, vi } from "vitest";

import {
  canPreviewTextInline,
  readTextPreview,
  sliceTextPreview,
  TEXT_PREVIEW_MAX_BYTES,
} from "@/lib/files/text-preview";

describe("readTextPreview", () => {
  it("decodes split UTF-8 chunks within the byte limit", async () => {
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([0xc3]));
          controller.enqueue(new Uint8Array([0xa9]));
          controller.close();
        },
      }),
    );

    await expect(readTextPreview(response)).resolves.toBe("é");
  });

  it("cancels and rejects a stream as soon as it exceeds the byte limit", async () => {
    const cancel = vi.fn();
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(TEXT_PREVIEW_MAX_BYTES));
          controller.enqueue(new Uint8Array([1]));
        },
        cancel,
      }),
    );

    await expect(readTextPreview(response)).rejects.toThrow("size limit");
    expect(cancel).toHaveBeenCalledOnce();
  });
});

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
