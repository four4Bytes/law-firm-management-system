import { describe, expect, it } from "vitest";

import { ACCEPTED_FILE_EXTENSIONS, isAcceptedFileExtension } from "../file-types";

describe("isAcceptedFileExtension", () => {
  it("accepts every extension in the shared allowlist (case-insensitive)", () => {
    for (const ext of ACCEPTED_FILE_EXTENSIONS) {
      expect(isAcceptedFileExtension(`doc${ext}`)).toBe(true);
      expect(isAcceptedFileExtension(`doc${ext.toUpperCase()}`)).toBe(true);
    }
  });

  it("rejects unknown and missing extensions", () => {
    expect(isAcceptedFileExtension("malware.exe")).toBe(false);
    expect(isAcceptedFileExtension("noextension")).toBe(false);
    expect(isAcceptedFileExtension("")).toBe(false);
  });
});
