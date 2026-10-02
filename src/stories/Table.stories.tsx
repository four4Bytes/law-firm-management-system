import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { type Selection, type SortDescriptor } from "react-aria-components";

import { Button } from "@/components/ui/Button/Button";
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
  argTypes: {
    selectionMode: {
      control: "select",
      options: ["none", "single", "multiple"],
    },
    selectionBehavior: {
      control: "select",
      options: ["toggle", "replace"],
      if: { arg: "selectionMode", neq: "none" },
    },
    disabledBehavior: {
      control: "select",
      options: ["selection", "all"],
    },
  },
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

export const Playground: Story = {
  argTypes: {
    selectionMode: {
      control: "select",
      options: ["none", "single", "multiple"],
    },
    selectionBehavior: {
      control: "select",
      options: ["toggle", "replace"],
      if: { arg: "selectionMode", neq: "none" },
    },
    disabledBehavior: {
      control: "select",
      options: ["selection", "all"],
    },
  },
  args: {
    selectionMode: "none",
    selectionBehavior: "toggle",
    disabledBehavior: "selection",
  },
  render: (args) => {
    function PlaygroundExample() {
      const [selected, setSelected] = useState<Selection>(new Set());

      const selectionProps =
        args.selectionMode !== "none"
          ? {
              selectionMode: args.selectionMode,
              selectionBehavior: args.selectionBehavior,
              disabledBehavior: args.disabledBehavior,
              selectedKeys: selected,
              onSelectionChange: setSelected,
            }
          : {};

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Table aria-label="Playground" {...selectionProps}>
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
          {args.selectionMode !== "none" && (
            <p
              style={{
                margin: 0,
                fontSize: "0.875rem",
                color: "#5f5a4b",
              }}
            >
              Selected:{" "}
              {selected === "all"
                ? "all"
                : Array.from(selected as Set<string>).join(", ") || "none"}
            </p>
          )}
        </div>
      );
    }

    return <PlaygroundExample />;
  },
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
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
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              color: "#5f5a4b",
            }}
          >
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

export const WithSingleSelection: Story = {
  render: () => {
    function SingleSelectionExample() {
      const [selected, setSelected] = useState<Selection>(new Set());

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Table
            aria-label="Single select table"
            selectionMode="single"
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
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              color: "#5f5a4b",
            }}
          >
            Selected:{" "}
            {selected === "all" ? "all" : Array.from(selected as Set<string>).join(", ") || "none"}
          </p>
        </div>
      );
    }

    return <SingleSelectionExample />;
  },
};

export const WithSelectionNoCheckboxes: Story = {
  render: () => {
    function SelectionNoCheckboxesExample() {
      const [selected, setSelected] = useState<Selection>(new Set());

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Table
            aria-label="Selectable table without checkboxes"
            selectionMode="single"
            selectionBehavior="replace"
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
        </div>
      );
    }

    return <SelectionNoCheckboxesExample />;
  },
};

export const WithInteractive: Story = {
  render: () => {
    function InteractiveExample() {
      const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
        column: "name",
        direction: "ascending",
      });
      const [selected, setSelected] = useState<Selection>(new Set());
      const columns = [
        { id: "name", name: "Name" },
        { id: "role", name: "Role" },
        { id: "status", name: "Status" },
      ];

      const sorted = [...data].sort((a, b) => {
        const first = a[sortDescriptor.column as keyof StoryItem];
        const second = b[sortDescriptor.column as keyof StoryItem];
        const cmp = String(first).localeCompare(String(second));
        return sortDescriptor.direction === "descending" ? -cmp : cmp;
      });

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <ResizableTableContainer>
            <Table
              aria-label="Interactive table"
              selectionMode="multiple"
              selectedKeys={selected}
              onSelectionChange={setSelected}
              sortDescriptor={sortDescriptor}
              onSortChange={setSortDescriptor}
            >
              <TableHeader columns={columns}>
                {(column) => (
                  <Column
                    id={column.id}
                    isRowHeader={column.id === "name"}
                    allowsSorting
                    allowsResizing={column.id !== "status"}
                  >
                    {column.name}
                  </Column>
                )}
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
          </ResizableTableContainer>
          <p
            style={{
              margin: 0,
              fontSize: "0.875rem",
              color: "#5f5a4b",
            }}
          >
            Selected:{" "}
            {selected === "all" ? "all" : Array.from(selected as Set<string>).join(", ") || "none"}
          </p>
        </div>
      );
    }

    return <InteractiveExample />;
  },
};

const longData: StoryItem[] = [
  {
    id: "1",
    name: "John Michael Doe",
    role: "Senior Corporate Lawyer specializing in mergers and acquisitions",
    status: "Active - Currently lead counsel on three major cross-border cases",
  },
  {
    id: "2",
    name: "Jane Elizabeth Smith",
    role: "Paralegal with expertise in legal document review, case management, and e-discovery",
    status: "Active",
  },
  {
    id: "3",
    name: 'Robert "Bob" Johnson III',
    role: "Process Server and field investigator for complex litigation matters",
    status: "Inactive - On extended leave until further notice",
  },
];

export const WithLongContent: Story = {
  render: () => (
    <div style={{ maxWidth: 600 }}>
      <Table aria-label="Table with long content">
        <TableHeader>
          <Column id="name" isRowHeader>
            Name
          </Column>
          <Column id="role">Role</Column>
          <Column id="status">Status</Column>
        </TableHeader>
        <TableBody items={longData}>
          {(item) => (
            <Row id={item.id}>
              <Cell>{item.name}</Cell>
              <Cell>{item.role}</Cell>
              <Cell>{item.status}</Cell>
            </Row>
          )}
        </TableBody>
      </Table>
    </div>
  ),
};

export const DisabledRows: Story = {
  render: () => (
    <Table aria-label="Table with disabled rows">
      <TableHeader>
        <Column id="name" isRowHeader>
          Name
        </Column>
        <Column id="role">Role</Column>
        <Column id="status">Status</Column>
      </TableHeader>
      <TableBody items={data}>
        {(item) => (
          <Row id={item.id} isDisabled={item.status === "Inactive"}>
            <Cell>{item.name}</Cell>
            <Cell>{item.role}</Cell>
            <Cell>{item.status}</Cell>
          </Row>
        )}
      </TableBody>
    </Table>
  ),
};

export const WithPagination: Story = {
  render: () => {
    function PaginatedExample() {
      const [page, setPage] = useState(1);
      const pageSize = 2;
      const totalPages = Math.ceil(data.length / pageSize);
      const paged = data.slice((page - 1) * pageSize, page * pageSize);

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Table aria-label="Paginated table">
            <TableHeader>
              <Column id="name" isRowHeader>
                Name
              </Column>
              <Column id="role">Role</Column>
              <Column id="status">Status</Column>
            </TableHeader>
            <TableBody items={paged}>
              {(item) => (
                <Row id={item.id}>
                  <Cell>{item.name}</Cell>
                  <Cell>{item.role}</Cell>
                  <Cell>{item.status}</Cell>
                </Row>
              )}
            </TableBody>
          </Table>
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              alignItems: "center",
              fontSize: "0.875rem",
            }}
          >
            <Button
              variant="primary"
              isDisabled={page === 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              style={{ width: "auto" }}
            >
              Previous
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="primary"
              isDisabled={page === totalPages}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{ width: "auto" }}
            >
              Next
            </Button>
          </div>
        </div>
      );
    }

    return <PaginatedExample />;
  },
};

export const Loading: Story = {
  render: () => {
    function LoadingExample() {
      const [isLoading, setIsLoading] = useState(true);

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <Table aria-label="Loading table">
            <TableHeader>
              <Column id="name" isRowHeader>
                Name
              </Column>
              <Column id="role">Role</Column>
              <Column id="status">Status</Column>
            </TableHeader>
            <TableBody items={isLoading ? [] : data} renderEmptyState={() => "Loading data\u2026"}>
              {(item) => (
                <Row id={item.id}>
                  <Cell>{item.name}</Cell>
                  <Cell>{item.role}</Cell>
                  <Cell>{item.status}</Cell>
                </Row>
              )}
            </TableBody>
          </Table>
          <Button
            variant="primary"
            onPress={() => setIsLoading((p) => !p)}
            style={{ width: "auto", alignSelf: "center" }}
          >
            {isLoading ? "Load Data" : "Clear Data"}
          </Button>
        </div>
      );
    }

    return <LoadingExample />;
  },
};
