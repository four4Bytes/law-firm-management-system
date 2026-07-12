import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FilePreviewCard } from "../FilePreviewCard";

const baseProps = {
  file_name: "contract.pdf",
  file_size: 2048,
  uploadedBy: "Jane Doe",
  created_at: new Date("2024-07-15"),
};

describe("FilePreviewCard", () => {
  it("sets data-category to pdf for a pdf file type", () => {
    const markup = renderToStaticMarkup(
      <FilePreviewCard {...baseProps} file_type="application/pdf" />,
    );
    expect(markup).toContain('data-category="pdf"');
  });

  it("sets data-category to doc for a word document file type", () => {
    const markup = renderToStaticMarkup(
      <FilePreviewCard {...baseProps} file_name="brief.docx" file_type="application/msword" />,
    );
    expect(markup).toContain('data-category="doc"');
  });

  it("sets data-category to img for an image file type", () => {
    const markup = renderToStaticMarkup(
      <FilePreviewCard {...baseProps} file_name="photo.png" file_type="image/png" />,
    );
    expect(markup).toContain('data-category="img"');
  });

  it("sets data-category to unknown for an unrecognized file type", () => {
    const markup = renderToStaticMarkup(
      <FilePreviewCard {...baseProps} file_name="mystery.xyz" file_type="application/x-mystery" />,
    );
    expect(markup).toContain('data-category="unknown"');
  });

  it("does not render an inline color style on the icon container", () => {
    const markup = renderToStaticMarkup(
      <FilePreviewCard {...baseProps} file_type="application/pdf" />,
    );
    expect(markup).not.toContain("--file-icon-color");
    expect(markup).not.toMatch(/data-category="pdf"[^>]*style=/);
  });

  it("renders the file name and formatted file size", () => {
    const markup = renderToStaticMarkup(
      <FilePreviewCard {...baseProps} file_type="application/pdf" />,
    );
    expect(markup).toContain("contract.pdf");
    expect(markup).toContain("2.0 KB");
  });

  it("renders 'Unknown' size when file_size is null", () => {
    const markup = renderToStaticMarkup(
      <FilePreviewCard {...baseProps} file_type="application/pdf" file_size={null} />,
    );
    expect(markup).toContain("Unknown");
  });
});