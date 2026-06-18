import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";

interface StoryItem {
  id: string;
  name: string;
  role: string;
  status: string;
}

const data: StoryItem[] = [
  { id: "1", name: "John Doe", role: "Lawyer", status: "Active" },
  { id: "2", name: "Jane Smith", role: "Paralegal", status: "Active" },
  { id: "3", name: "Bob Johnson", role: "Process Server", status: "Inactive" },
  { id: "4", name: "Alice Williams", role: "Attorney", status: "Active" },
  { id: "5", name: "Charlie Brown", role: "Paralegal", status: "Inactive" },
];

const columns: ColumnDef<StoryItem>[] = [
  { id: "name", name: "Name", isRowHeader: true, allowsSorting: true },
  { id: "role", name: "Role", allowsSorting: true },
  { id: "status", name: "Status", allowsSorting: true },
];

const meta = {
  component: DataTable,
  tags: ["autodocs"],
} as Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <DataTable columns={columns} rows={data} />,
};

export const Empty: Story = {
  render: () => <DataTable columns={columns} rows={[]} emptyContent="No results found." />,
};

export const Loading: Story = {
  render: () => <DataTable columns={columns} rows={[]} isLoading />,
};

export const WithLoadMore: Story = {
  render: () => (
    <DataTable columns={columns} rows={data.slice(0, 3)} hasMore onLoadMore={() => {}} />
  ),
};

export const WithRowAction: Story = {
  render: () => (
    <DataTable columns={columns} rows={data} onRowAction={(id) => alert(`Row ${id} clicked`)} />
  ),
};

export const WithSelection: Story = {
  render: () => (
    <DataTable
      columns={columns}
      rows={data}
      selectionMode="multiple"
      onSelectionChange={(keys) => console.log(keys)}
    />
  ),
};
