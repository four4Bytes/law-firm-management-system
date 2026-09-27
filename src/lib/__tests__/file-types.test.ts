import { describe, expect, it } from "vitest";

import {
  ACCEPTED_FILE_EXTENSIONS,
  classifyFileType,
  getFileDescriptor,
  getFileExtension,
  isAcceptedFileExtension,
  isImageFile,
} from "@/lib/files/file-types";

describe("getFileExtension", () => {
  it("lowercases the trailing extension", () => {
    expect(getFileExtension("Property Deed.PDF")).toBe("pdf");
    expect(getFileExtension("archive.tar.GZ")).toBe("gz");
  });

  it("returns an empty string when there is no usable extension", () => {
    expect(getFileExtension("noextension")).toBe("");
    expect(getFileExtension("trailingdot.")).toBe("");
    expect(getFileExtension("")).toBe("");
  });

  it("uses only the final segment of a multi-dot name", () => {
    expect(getFileExtension("evidence.bundle.zip")).toBe("zip");
  });
});

describe("getFileDescriptor", () => {
  it("resolves every allowlisted extension to a presentable type", () => {
    for (const extension of ACCEPTED_FILE_EXTENSIONS) {
      const descriptor = getFileDescriptor({ fileName: `attachment${extension}` });

      expect(descriptor.category, extension).not.toBe("unknown");
      expect(descriptor.label, extension).not.toBe("");
      expect(descriptor.mime, extension).toContain("/");
    }
  });

  it("prefers the extension over a conflicting stored type", () => {
    expect(getFileDescriptor({ fileName: "brief.docx", fileType: "application/pdf" })).toEqual({
      category: "doc",
      label: "DOCX",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  });

  it.each(["", "application/octet-stream", "binary/octet-stream"])(
    "falls back to the extension when the stored type is %s",
    (fileType) => {
      expect(getFileDescriptor({ fileName: "notes.csv", fileType }).label).toBe("CSV");
    },
  );

  it("matches the extension case-insensitively", () => {
    expect(getFileDescriptor({ fileName: "DEED.PDF" }).category).toBe("pdf");
  });

  it("falls back to the stored type for extensions outside the allowlist", () => {
    expect(getFileDescriptor({ fileName: "evidence.zip", fileType: "application/zip" })).toEqual({
      category: "zip",
      label: "ZIP",
      mime: "application/zip",
    });
  });

  it("classifies a spreadsheet ahead of a document when both substrings appear", () => {
    // The OpenXML Word and Excel types both contain "document", so the
    // spreadsheet branches of the fallback classifier must be tested first.
    const word = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const excel = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    expect(classifyFileType({ fileName: "unknown-a", fileType: word })).toBe("doc");
    expect(classifyFileType({ fileName: "unknown-b", fileType: excel })).toBe("xls");
  });

  it("normalizes casing and discards MIME parameters on the fallback path", () => {
    // An unregistered extension is required to reach the MIME fallback at all.
    expect(getFileDescriptor({ fileName: "clip.bin", fileType: "VIDEO/MP4; CODECS=avc1" })).toEqual(
      { category: "video", label: "VIDEO", mime: "video/mp4" },
    );
  });

  it("ignores an inherited property name as an extension", () => {
    const expected = { category: "unknown", label: "", mime: "application/octet-stream" };

    expect(getFileDescriptor({ fileName: "report.constructor" })).toEqual(expected);
    expect(getFileDescriptor({ fileName: "report.toString" })).toEqual(expected);
  });

  it("returns a labelless generic descriptor when neither signal is informative", () => {
    const expected = { category: "unknown", label: "", mime: "application/octet-stream" };

    expect(getFileDescriptor({ fileName: "noextension" })).toEqual(expected);
    expect(
      getFileDescriptor({ fileName: "scanned.bin", fileType: "application/octet-stream" }),
    ).toEqual(expected);
  });
});

describe("classifyFileType", () => {
  it.each([
    ["deed.pdf", "pdf"],
    ["brief.docx", "doc"],
    ["ledger.xlsx", "xls"],
    ["photo.jpeg", "img"],
    ["notes.txt", "txt"],
    ["export.csv", "txt"],
    ["footage.mp4", "video"],
  ])("classifies %s as %s from the name alone", (fileName, category) => {
    expect(classifyFileType({ fileName })).toBe(category);
  });

  it("ignores a missing stored type for allowlisted files", () => {
    expect(classifyFileType({ fileName: "photo.png" })).toBe("img");
  });
});

describe("isImageFile", () => {
  it("trusts the file name over the browser-reported type", () => {
    expect(isImageFile({ name: "site-visit.png", type: "" })).toBe(true);
    expect(isImageFile({ name: "site-visit.png", type: "application/octet-stream" })).toBe(true);
  });

  it("rejects non-images and uninformative files", () => {
    expect(isImageFile({ name: "deposition.pdf", type: "application/pdf" })).toBe(false);
    expect(isImageFile({ name: "scan.bin", type: "" })).toBe(false);
  });
});

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
    expect(isAcceptedFileExtension("trailingdot.")).toBe(false);
  });
});
