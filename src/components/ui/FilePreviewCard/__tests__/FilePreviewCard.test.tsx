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
  it("renders an inline color style on the icon container", () => {
    const markup = renderToStaticMarkup(
      <FilePreviewCard {...baseProps} file_type="application/pdf" />,
    );
    expect(markup).toContain("--file-icon-color");
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