import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DocumentList } from "@/features/documents/components/DocumentList/DocumentList";
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

const meta: Meta<typeof DocumentList> = {
  component: DocumentList,
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
type Story = StoryObj<typeof DocumentList>;

const noop = () => {};

export const WithActions: Story = {
  args: {
    documents: [
      createDocument(),
      createDocument({
        id: "d2",
        file_name: "Financial-Statement-Q3.xlsx",
        file_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        file_size: 524_288,
      }),
    ],
    isBusy: false,
    onView: noop,
    onDownload: noop,
    onDelete: noop,
  },
};

export const ReadOnly: Story = {
  args: {
    documents: [createDocument()],
    isBusy: false,
    onView: noop,
    onDownload: noop,
  },
};

export const WithoutSize: Story = {
  args: {
    documents: [
      createDocument(),
      createDocument({ id: "d2", file_name: "service-of-process.pdf" }),
    ],
    isBusy: false,
    showSize: false,
    onDownload: noop,
  },
  parameters: {
    docs: {
      description: {
        story: "Used where the surrounding row already shows size metadata (task attachments).",
      },
    },
  },
};

export const Loading: Story = {
  args: {
    documents: [],
    isBusy: true,
    isLoading: true,
  },
};

export const Empty: Story = {
  args: {
    documents: [],
    isBusy: false,
  },
  parameters: {
    docs: {
      description: {
        story: "Renders nothing when there are no saved documents.",
      },
    },
  },
};
