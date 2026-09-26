import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DocumentListRow } from "@/features/documents/components/DocumentListRow/DocumentListRow";
import type { DocumentRow } from "@/features/documents/queries";

function createDocument(overrides: Partial<DocumentRow> = {}): DocumentRow {
  return {
    id: "d1",
    file_name: "Property Deed - Lot 24-B.pdf",
    file_type: "application/pdf",
    file_size: 1_842_944,
    uploadedBy: "John Rey Rabosa",
    created_at: new Date("2026-09-20T10:30:00.000Z"),
    task: null,
    ...overrides,
  };
}

const meta: Meta<typeof DocumentListRow> = {
  component: DocumentListRow,
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
type Story = StoryObj<typeof DocumentListRow>;

const noop = () => {};

export const ReadOnly: Story = {
  args: {
    document: createDocument(),
    isBusy: false,
    onView: noop,
    onDownload: noop,
  },
};

export const AllActions: Story = {
  args: {
    document: createDocument(),
    isBusy: false,
    onView: noop,
    onDownload: noop,
    onDelete: noop,
  },
};

export const Spreadsheet: Story = {
  args: {
    document: createDocument({
      id: "d2",
      file_name: "Financial-Statement-Q3.xlsx",
      file_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      file_size: 524_288,
    }),
    isBusy: false,
    onDownload: noop,
  },
};

export const Downloading: Story = {
  args: {
    document: createDocument(),
    isBusy: true,
    isDownloading: true,
    onDownload: noop,
  },
};

export const LinkedTask: Story = {
  args: {
    document: createDocument({
      id: "d3",
      file_name: "service-of-process-proof.pdf",
      file_type: "application/pdf",
      file_size: 331_776,
      task: { id: "t1", title: "Serve summons", case_id: "c1" },
    }),
    isBusy: false,
    onDownload: noop,
  },
};
