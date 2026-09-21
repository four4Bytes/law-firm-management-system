import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { ColumnDef } from "@/components/ui/DataTable/DataTable";
import { ServerDataTable } from "@/components/ui/ServerDataTable/ServerDataTable";

interface StoryItem {
  id: string;
  name: string;
  role: string;
}

const mockData: StoryItem[] = [
  { id: "1", name: "Alice Johnson", role: "Admin" },
  { id: "2", name: "Bob Smith", role: "Lawyer" },
  { id: "3", name: "Carol Williams", role: "Paralegal" },
  { id: "4", name: "David Brown", role: "Branch Manager" },
  { id: "5", name: "Eve Davis", role: "Process Server" },
  { id: "6", name: "Frank Miller", role: "Lawyer" },
  { id: "7", name: "Grace Wilson", role: "Paralegal" },
  { id: "8", name: "Henry Taylor", role: "Admin" },
  { id: "9", name: "Iris Anderson", role: "Lawyer" },
  { id: "10", name: "Jack Thomas", role: "Process Server" },
];

const mockFetch = async ({
  search,
  cursor,
  pageSize = 5,
  filters,
}: {
  search?: string;
  cursor?: string;
  pageSize?: number;
  filters?: Record<string, string[]>;
}) => {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const roles = filters?.role ?? [];
  const filtered = mockData.filter(
    (d) =>
      (!search || d.name.toLowerCase().includes(search.toLowerCase())) &&
      (roles.length === 0 || roles.includes(d.role)),
  );

  const startIndex = cursor ? filtered.findIndex((d) => d.id === cursor) + 1 : 0;
  const page = filtered.slice(startIndex, startIndex + pageSize);

  return {
    rows: page,
    nextCursor: page.length === pageSize ? page[page.length - 1].id : null,
  };
};

const columns: ColumnDef<StoryItem>[] = [
  { id: "name", name: "Name", isRowHeader: true },
  { id: "role", name: "Role" },
];

const meta = {
  component: ServerDataTable,
  tags: ["autodocs"],
} as Meta<typeof ServerDataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ServerDataTable
      fetchAction={mockFetch}
      columns={columns}
      searchPlaceholder="Search users..."
      emptyContent="No users found"
      loadingMessage="Loading users..."
      searchLabel="Search users"
      renderAddButton
      addButtonLabel="Add User"
    />
  ),
};

export const NoAddButton: Story = {
  render: () => (
    <ServerDataTable
      fetchAction={mockFetch}
      columns={columns}
      searchPlaceholder="Search users..."
      emptyContent="No users found"
      loadingMessage="Loading users..."
      searchLabel="Search users"
    />
  ),
};

export const WithFilters: Story = {
  render: () => (
    <ServerDataTable
      fetchAction={mockFetch}
      columns={columns}
      searchPlaceholder="Search users..."
      emptyContent="No users found"
      loadingMessage="Loading users..."
      searchLabel="Search users"
      filters={[
        {
          key: "role",
          label: "Role",
          options: [
            { value: "Admin", label: "Admin" },
            { value: "Lawyer", label: "Lawyer" },
            { value: "Paralegal", label: "Paralegal" },
          ],
        },
      ]}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <ServerDataTable
      fetchAction={async () => {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return { rows: [], nextCursor: null };
      }}
      columns={columns}
      searchPlaceholder="Search..."
      emptyContent="No items to display"
      loadingMessage="Loading..."
      searchLabel="Search"
    />
  ),
};
