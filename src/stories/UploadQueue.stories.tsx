import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { UploadQueue } from "@/features/documents/components/UploadQueue/UploadQueue";
import type { FileEntry } from "@/lib/hooks/useFileUpload";

let nextEntryId = 0;

function createEntry(
  fileName: string,
  fileType: string,
  status: FileEntry["status"] = "pending",
): FileEntry {
  return {
    id: nextEntryId++,
    file: new File([], fileName, { type: fileType }),
    status,
  };
}

const THUMBNAIL_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' fill='%235a7c58'/%3E%3C/svg%3E";

const meta: Meta<typeof UploadQueue> = {
  component: UploadQueue,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "30rem", maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UploadQueue>;

const noop = () => {};

export const Pending: Story = {
  args: {
    entries: [
      createEntry("Property Deed - Lot 24-B.pdf", "application/pdf"),
      createEntry("evidence-bundle.zip", "application/zip"),
    ],
    isBusy: false,
    onRemove: noop,
  },
};

export const MixedStatuses: Story = {
  args: {
    entries: [
      createEntry("Property Deed - Lot 24-B.pdf", "application/pdf"),
      createEntry("site-visit.jpg", "image/jpeg"),
      createEntry("hearing-recording.mp4", "video/mp4"),
      createEntry("client-intake.docx", "application/msword", "uploading"),
      createEntry("affidavit.pdf", "application/pdf", "failed"),
    ],
    isBusy: true,
    onRemove: noop,
    getPreviewUrl: (entry) => (entry.file.type === "image/jpeg" ? THUMBNAIL_SRC : null),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Queued rows show type icons (image rows get a thumbnail), per-file status, and a remove action.",
      },
    },
  },
};

export const Empty: Story = {
  args: {
    entries: [],
    isBusy: false,
    onRemove: noop,
  },
  parameters: {
    docs: {
      description: {
        story: "Renders nothing when no files are queued.",
      },
    },
  },
};
