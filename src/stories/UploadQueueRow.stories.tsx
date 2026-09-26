import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { UploadQueueRow } from "@/features/documents/components/UploadQueueRow/UploadQueueRow";
import type { FileEntry } from "@/lib/hooks/useFileUpload";

let nextEntryId = 0;

function createEntry(fileName: string, fileType: string): FileEntry {
  return {
    id: nextEntryId++,
    file: new File([], fileName, { type: fileType }),
    status: "pending",
  };
}

const meta: Meta<typeof UploadQueueRow> = {
  component: UploadQueueRow,
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
type Story = StoryObj<typeof UploadQueueRow>;

const noop = () => {};

export const Pending: Story = {
  args: {
    entry: createEntry("Property Deed - Lot 24-B.pdf", "application/pdf"),
    isBusy: false,
    onRemove: noop,
  },
};

export const ImageWithThumbnail: Story = {
  args: {
    entry: createEntry("site-visit.jpg", "image/jpeg"),
    previewUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%235a7c58'/%3E%3C/svg%3E",
    isBusy: false,
    onRemove: noop,
  },
};

export const Video: Story = {
  args: {
    entry: createEntry("hearing-recording.mp4", "video/mp4"),
    isBusy: false,
    onRemove: noop,
  },
};

export const Uploading: Story = {
  args: {
    entry: {
      ...createEntry("evidence-bundle.zip", "application/zip"),
      status: "uploading",
    },
    isBusy: true,
    onRemove: noop,
  },
};

export const Done: Story = {
  args: {
    entry: { ...createEntry("client-intake.docx", "application/msword"), status: "done" },
    isBusy: true,
    onRemove: noop,
  },
};

export const Failed: Story = {
  args: {
    entry: {
      ...createEntry("affidavit.pdf", "application/pdf"),
      status: "failed",
      error: "Storage rejected the file. Please try again.",
    },
    isBusy: false,
    onRemove: noop,
  },
};
