import { describe, expect, it } from "vitest";

import { formatFileCategoryName, formatFileType, isPlayableVideo } from "@/lib/files/file-format";
import { getFileDescriptor } from "@/lib/files/file-types";

describe("formatFileType", () => {
  it("labels each file by its exact extension", () => {
    expect(formatFileType({ fileName: "brief.doc" })).toBe("DOC");
    expect(formatFileType({ fileName: "brief.docx" })).toBe("DOCX");
    expect(formatFileType({ fileName: "export.csv" })).toBe("CSV");
  });

  it("returns an empty string for an unrecognizable file so callers can omit it", () => {
    expect(formatFileType({ fileName: "scanned.bin", fileType: "application/octet-stream" })).toBe(
      "",
    );
  });
});

describe("formatFileCategoryName", () => {
  it("names each category", () => {
    expect(formatFileCategoryName("txt")).toBe("Text File");
    expect(formatFileCategoryName("video")).toBe("Video");
    expect(formatFileCategoryName("xls")).toBe("Spreadsheet");
  });

  it("falls back to a generic name for the unknown category", () => {
    expect(formatFileCategoryName("unknown")).toBe("File");
  });
});

describe("isPlayableVideo", () => {
  it("accepts the resolved types of containers browsers can play", () => {
    for (const fileName of ["footage.mp4", "footage.webm", "footage.mov", "footage.m4v"]) {
      expect(isPlayableVideo(getFileDescriptor({ fileName }).mime), fileName).toBe(true);
    }
  });

  it("rejects containers that need a transcode, even though they are accepted uploads", () => {
    for (const fileName of ["footage.avi", "footage.mkv"]) {
      expect(isPlayableVideo(getFileDescriptor({ fileName }).mime), fileName).toBe(false);
    }
  });

  it("ignores casing and MIME parameters", () => {
    expect(isPlayableVideo("VIDEO/MP4; codecs=avc1.42E01E")).toBe(true);
  });
});
