import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FileRow } from "@/features/documents/components/FileRow/FileRow";

const meta: Meta<typeof FileRow> = {
  component: FileRow,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "26rem", maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FileRow>;

export const Pdf: Story = {
  args: {
    fileName: "Property Deed - Lot 24-B.pdf",
    fileType: "application/pdf",
    fileSize: 1_842_944,
  },
};

export const Word: Story = {
  args: {
    fileName: "Client-Intake-Form.docx",
    fileType: "application/msword",
    fileSize: 245_760,
  },
};

export const Image: Story = {
  args: {
    fileName: "site-visit.jpg",
    fileType: "image/jpeg",
    fileSize: 3_145_728,
  },
};

export const ImageWithThumbnail: Story = {
  args: {
    fileName: "site-visit.jpg",
    fileType: "image/jpeg",
    fileSize: 3_145_728,
    previewUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%235a7c58'/%3E%3C/svg%3E",
  },
};

/** The browser reported no type, which the extension resolves on its own. */
export const MissingMimeType: Story = {
  args: {
    fileName: "Client-Intake-Form.docx",
    fileType: "",
    fileSize: 245_760,
  },
};

export const UnknownSize: Story = {
  args: {
    fileName: "scanned-document.bin",
    fileType: "application/octet-stream",
    fileSize: null,
  },
};

/** Size omitted entirely, as opposed to `null`, which renders "Unknown". */
export const SizeHidden: Story = {
  args: {
    fileName: "Property Deed - Lot 24-B.pdf",
    fileType: "application/pdf",
  },
};

export const TypeHidden: Story = {
  args: {
    fileName: "Property Deed - Lot 24-B.pdf",
    fileType: "application/pdf",
    fileSize: 1_842_944,
    showFileType: false,
  },
};

export const WithTrailingSlot: Story = {
  args: {
    fileName: "evidence-bundle.zip",
    fileType: "application/zip",
    fileSize: 12_582_912,
    trailing: <span>3 actions</span>,
  },
};
