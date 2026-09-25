import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { isAcceptedFileExtension } from "@/lib/files/file-types";
import {
  DEFAULT_MAX_UPLOAD_BYTES,
  findDuplicateFiles,
  isWithinUploadSizeLimit,
} from "@/lib/files/upload-policy";

function createFile(name: string, size: number, lastModified = 1_757_000_000_000): File {
  const file = new File([], name, { type: "application/octet-stream" });
  Object.defineProperty(file, "size", { value: size });
  Object.defineProperty(file, "lastModified", { value: lastModified });
  return file;
}

const originalServerLimit = process.env.APP_MAX_UPLOAD_BYTES;
const originalPublicLimit = process.env.NEXT_PUBLIC_APP_MAX_UPLOAD_BYTES;

beforeEach(() => {
  delete process.env.APP_MAX_UPLOAD_BYTES;
  delete process.env.NEXT_PUBLIC_APP_MAX_UPLOAD_BYTES;
});

afterEach(() => {
  if (originalServerLimit === undefined) delete process.env.APP_MAX_UPLOAD_BYTES;
  else process.env.APP_MAX_UPLOAD_BYTES = originalServerLimit;

  if (originalPublicLimit === undefined) delete process.env.NEXT_PUBLIC_APP_MAX_UPLOAD_BYTES;
  else process.env.NEXT_PUBLIC_APP_MAX_UPLOAD_BYTES = originalPublicLimit;
});

describe("isWithinUploadSizeLimit", () => {
  it("accepts a file at the default limit", () => {
    expect(isWithinUploadSizeLimit(DEFAULT_MAX_UPLOAD_BYTES)).toBe(true);
  });

  it("rejects a file over the default limit", () => {
    expect(isWithinUploadSizeLimit(DEFAULT_MAX_UPLOAD_BYTES + 1)).toBe(false);
  });

  it("honors the public limit", () => {
    process.env.NEXT_PUBLIC_APP_MAX_UPLOAD_BYTES = String(1024);
    expect(isWithinUploadSizeLimit(1024)).toBe(true);
    expect(isWithinUploadSizeLimit(1025)).toBe(false);
  });

  it("ignores a malformed override and uses the default", () => {
    process.env.NEXT_PUBLIC_APP_MAX_UPLOAD_BYTES = "not-a-number";
    expect(isWithinUploadSizeLimit(DEFAULT_MAX_UPLOAD_BYTES)).toBe(true);
  });

  it("does not apply a server-only limit", () => {
    process.env.APP_MAX_UPLOAD_BYTES = String(1024);
    expect(isWithinUploadSizeLimit(DEFAULT_MAX_UPLOAD_BYTES)).toBe(true);
  });
});

describe("findDuplicateFiles", () => {
  it("returns nothing when all files are new", () => {
    const incoming = [createFile("a.pdf", 100), createFile("b.pdf", 200)];
    expect(findDuplicateFiles(incoming, [])).toEqual([]);
  });

  it("detects a file already in the queue", () => {
    const queued = [createFile("a.pdf", 100)];
    expect(findDuplicateFiles([createFile("a.pdf", 100)], queued)).toHaveLength(1);
  });

  it("does not treat a same-name file with a different size as a duplicate", () => {
    const queued = [createFile("a.pdf", 100)];
    expect(findDuplicateFiles([createFile("a.pdf", 999)], queued)).toEqual([]);
  });

  it("detects duplicates within a single batch", () => {
    const incoming = [createFile("a.pdf", 100), createFile("a.pdf", 100)];
    expect(findDuplicateFiles(incoming, [])).toHaveLength(1);
  });
});

describe("isAcceptedFileExtension", () => {
  it.each([".pdf", ".docx", ".xlsx", ".png", ".jpg", ".txt", ".csv"])("accepts %s", (extension) => {
    expect(isAcceptedFileExtension(`evidence${extension}`)).toBe(true);
  });

  it.each([".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"])("accepts video %s", (extension) => {
    expect(isAcceptedFileExtension(`hearing${extension}`)).toBe(true);
  });

  it("rejects executable files", () => {
    expect(isAcceptedFileExtension("malware.exe")).toBe(false);
  });
});
