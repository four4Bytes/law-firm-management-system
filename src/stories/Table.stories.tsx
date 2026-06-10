import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { type Selection, type SortDescriptor } from "react-aria-components";

import {
  Cell,
  Column,
  ResizableTableContainer,
  Row,
  Table,
  TableBody,
  TableHeader,
} from "@/components/ui/Table/Table";

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
      <TableBody items={[]} renderEmptyState={() => "No results found."}>
        {[]}
      </TableBody>
    </Table>
  ),
};

export const WithSelection: Story = {
  render: () => {
    function SelectionExample() {
      const [selected, setSelected] = useState<Selection>(new Set());

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Table
            aria-label="Selectable table"
            selectionMode="multiple"
            selectedKeys={selected}
            onSelectionChange={setSelected}
          >
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
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#5f5a4b" }}>
            Selected:{" "}
            {selected === "all" ? "all" : Array.from(selected as Set<string>).join(", ") || "none"}
          </p>
        </div>
      );
    }

    return <SelectionExample />;
  },
};

export const WithSorting: Story = {
  render: () => {
    function SortableExample() {
      const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "name",
        direction: "ascending",
      });

      const sorted = [...data].sort((a, b) => {
        const first = a[sortDescriptor.column as keyof StoryItem];
        const second = b[sortDescriptor.column as keyof StoryItem];
        const cmp = String(first).localeCompare(String(second));
        return sortDescriptor.direction === "descending" ? -cmp : cmp;
      });

      return (
        <Table
          aria-label="Sortable table"
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
        >
          <TableHeader>
            <Column id="name" isRowHeader allowsSorting>
              Name
            </Column>
            <Column id="role" allowsSorting>
              Role
            </Column>
            <Column id="status" allowsSorting>
              Status
            </Column>
          </TableHeader>
          <TableBody items={sorted}>
            {(item) => (
              <Row id={item.id}>
                <Cell>{item.name}</Cell>
                <Cell>{item.role}</Cell>
                <Cell>{item.status}</Cell>
              </Row>
            )}
          </TableBody>
        </Table>
      );
    }

    return <SortableExample />;
  },
};

export const WithResizableColumns: Story = {
  render: () => {
    const columns = [
      { id: "name", name: "Name" },
      { id: "role", name: "Role" },
      { id: "status", name: "Status" },
    ];

    return (
      <ResizableTableContainer>
        <Table aria-label="Resizable table">
          <TableHeader columns={columns}>
            {(column) => (
              <Column id={column.id} isRowHeader={column.id === "name"} allowsResizing>
                {column.name}
              </Column>
            )}
          </TableHeader>
          <TableBody items={data}>
            {(item) => (
              <Row>
                <Cell>{item.name}</Cell>
                <Cell>{item.role}</Cell>
                <Cell>{item.status}</Cell>
              </Row>
            )}
          </TableBody>
        </Table>
      </ResizableTableContainer>
    );
  },
};
