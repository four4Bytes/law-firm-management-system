import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Cell, Column, Row, Table, TableBody, TableHeader } from "@/components/ui/Table/Table";
import styles from "@/components/ui/Table/Table.module.css";

interface StoryItem {
  id: string;
  name: string;
  role: string;
  status: string;
}

const data: StoryItem[] = [
  { id: "1", name: "John Doe", role: "Lawyer", status: "Active" },
  { id: "2", name: "Jane Smith", role: "Paralegal", status: "Active" },
  { id: "3", name: "Bob Johnson", role: "ProcessServer", status: "Inactive" },
];

const meta = {
  component: Table,
  tags: ["autodocs"],
} as Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithData: Story = {
  render: () => (
    <Table aria-label="Example Table">
      <TableHeader>
        <Column id="name" isRowHeader>
          Name
        </Column>
        <Column id="role">Role</Column>
        <Column id="status">Status</Column>
      </TableHeader>
      <TableBody items={data}>
        {(item) => (
          <Row id={item.id}>
            <Cell>{item.name}</Cell>
            <Cell>{item.role}</Cell>
            <Cell>{item.status}</Cell>
          </Row>
        )}
      </TableBody>
    </Table>
  ),
};

export const Empty: Story = {
  render: () => (
    <Table aria-label="Empty Table">
      <TableHeader>
        <Column id="name" isRowHeader>
          Name
        </Column>
        <Column id="role">Role</Column>
        <Column id="status">Status</Column>
      </TableHeader>
      <TableBody
        items={[]}
        renderEmptyState={() => <div className={styles.empty}>No items to display</div>}
      >
        {[]}
      </TableBody>
    </Table>
  ),
};
