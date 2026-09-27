import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FileIcon } from "@/features/documents/components/FileIcon/FileIcon";
import { classifyFileType } from "@/lib/files/file-types";

/**
 * One representative file per category, resolved through the same rules the app
 * uses. `ppt` and `zip` are not accepted uploads; they exist to show the
 * categories reachable through the stored-MIME fallback.
 */
const CATEGORY_EXAMPLES: { fileName: string; fileType?: string }[] = [
  { fileName: "Property Deed.pdf" },
  { fileName: "Client Intake.docx" },
  { fileName: "Cost Breakdown.xlsx" },
  { fileName: "Deposition.ppt", fileType: "application/vnd.ms-powerpoint" },
  { fileName: "Site Visit.png" },
  { fileName: "Hearing Footage.mp4" },
  { fileName: "Evidence Bundle.zip", fileType: "application/zip" },
  { fileName: "Case Notes.txt" },
  { fileName: "scanned-document.bin", fileType: "application/octet-stream" },
];

const meta: Meta<typeof FileIcon> = {
  component: FileIcon,
  tags: ["autodocs"],
  argTypes: {
    category: {
      control: { type: "select" },
      options: CATEGORY_EXAMPLES.map((file) => classifyFileType(file)),
    },
  },
  decorators: [
    (Story) => (
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", fontSize: "2rem" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FileIcon>;

export const Pdf: Story = { args: { category: "pdf" } };
export const Word: Story = { args: { category: "doc" } };
export const Spreadsheet: Story = { args: { category: "xls" } };
export const Presentation: Story = { args: { category: "ppt" } };
export const Image: Story = { args: { category: "img" } };
export const Video: Story = { args: { category: "video" } };
export const Archive: Story = { args: { category: "zip" } };
export const Text: Story = { args: { category: "txt" } };

/** Neither the extension nor the stored type was informative. */
export const Unknown: Story = { args: { category: "unknown" } };

export const AllCategories: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", fontSize: "2rem" }}>
      {CATEGORY_EXAMPLES.map((file) => (
        <FileIcon key={file.fileName} category={classifyFileType(file)} />
      ))}
    </div>
  ),
};
