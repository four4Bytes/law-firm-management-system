import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DocumentPreview } from "@/features/documents/components/DocumentPreview/DocumentPreview";
import type { AuthorizedDocument } from "@/features/documents/queries";

const IMAGE_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='420'%3E%3Crect width='640' height='420' fill='%23f1ece0'/%3E%3Crect x='30' y='30' width='580' height='360' fill='none' stroke='%235a7c58' stroke-width='4'/%3E%3Ctext x='320' y='220' font-family='sans-serif' font-size='26' fill='%235f5a4b' text-anchor='middle'%3ESite Photo%3C/text%3E%3C/svg%3E";

const CSV_CONTENT = [
  "date,description,amount,status",
  "2026-01-12,Initial consultation retainer,15000,paid",
  "2026-02-03,Filing fee - RTC,4250,paid",
].join("\n");

const CSV_SRC = `data:text/csv;charset=utf-8,${encodeURIComponent(CSV_CONTENT)}`;

function createDocument(overrides: Partial<AuthorizedDocument> = {}): AuthorizedDocument {
  return {
    id: "d1",
    file_name: "document.pdf",
    file_type: "application/pdf",
    file_size: 921_600,
    uploadedBy: "John Rey Rabosa",
    created_at: new Date("2026-09-20T10:30:00.000Z"),
    file_path: "cases/c1/document.pdf",
    case: { id: "c1", case_title: "Rodriguez Estate Settlement" },
    consultation: null,
    task: null,
    ...overrides,
  };
}

const meta: Meta<typeof DocumentPreview> = {
  component: DocumentPreview,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ display: "flex", width: "100%", height: "32rem" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DocumentPreview>;

export const Image: Story = {
  args: {
    src: IMAGE_SRC,
    document: createDocument({
      file_name: "site-visit.jpg",
      file_type: "image/jpeg",
      file_size: 3_145_728,
    }),
  },
};

export const Csv: Story = {
  args: {
    src: CSV_SRC,
    document: createDocument({
      file_name: "matter-ledger.csv",
      file_type: "text/csv",
      file_size: 2_048,
      consultation: { id: "cons1", concern: "Boundary dispute with neighbouring owner" },
      case: null,
    }),
  },
};

export const CannotBePreviewed: Story = {
  args: {
    src: "https://example.test/never-loaded.docx",
    document: createDocument({
      file_name: "affidavit.docx",
      file_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      file_size: 88_064,
    }),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Types that cannot be rendered fall back to a placeholder offering a download — the only download affordance on the page, and only when it is the way forward.",
      },
    },
  },
};

export const UnplayableVideo: Story = {
  args: {
    src: "https://example.test/never-loaded.avi",
    document: createDocument({
      file_name: "hearing-recording.avi",
      file_type: "video/x-msvideo",
      file_size: 48_234_496,
    }),
  },
};
