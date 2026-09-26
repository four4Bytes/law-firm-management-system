import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { FileIcon } from "@/features/documents/components/FileIcon/FileIcon";

const FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "image/png",
  "application/zip",
  "text/plain",
  "text/csv",
  "application/octet-stream",
];

const meta: Meta<typeof FileIcon> = {
  component: FileIcon,
  tags: ["autodocs"],
  argTypes: {
    fileType: {
      control: { type: "select" },
      options: FILE_TYPES,
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

export const Pdf: Story = { args: { fileType: "application/pdf" } };
export const Word: Story = { args: { fileType: "application/msword" } };
export const Excel: Story = { args: { fileType: "application/vnd.ms-excel" } };
export const PowerPoint: Story = {
  args: { fileType: "application/vnd.ms-powerpoint" },
};
export const Image: Story = { args: { fileType: "image/png" } };
export const Archive: Story = { args: { fileType: "application/zip" } };
export const Text: Story = { args: { fileType: "text/plain" } };
export const Csv: Story = { args: { fileType: "text/csv" } };
export const Unknown: Story = { args: { fileType: "application/octet-stream" } };

export const AllCategories: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", fontSize: "2rem" }}>
      {FILE_TYPES.map((fileType) => (
        <FileIcon key={fileType} fileType={fileType} />
      ))}
    </div>
  ),
};
