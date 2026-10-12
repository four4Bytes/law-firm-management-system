// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable, type ColumnDef } from "../DataTable";

afterEach(cleanup);

interface TitleRow {
  id: string;
  title: string;
}

const cols: ColumnDef<TitleRow>[] = [{ id: "title", name: "Title", isRowHeader: true }];

const rows: TitleRow[] = [{ id: "a", title: "Task A" }];

function expansionProps() {
  return {
    renderExpandedContent: (row: TitleRow) => <span>Details for {row.title}</span>,
    getExpandAriaLabel: (row: TitleRow) => `Expand subtasks for ${row.title}`,
  };
}

describe("DataTable expansion", () => {
  it("renders flat rows with no toggle by default", () => {
    render(<DataTable columns={cols} rows={rows} />);
    expect(screen.getByText("Task A")).not.toBeNull();
    expect(screen.queryByLabelText(/expand/i)).toBeNull();
  });

  it("toggles a detail row via the chevron", () => {
    render(<DataTable columns={cols} rows={rows} {...expansionProps()} />);
    const toggle = screen.getByLabelText("Expand subtasks for Task A");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Details for Task A")).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Details for Task A")).not.toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Details for Task A")).toBeNull();
  });

  it("supports controlled expansion", () => {
    const onExpandedChange = vi.fn();
    render(
      <DataTable
        columns={cols}
        rows={rows}
        expandedKeys={new Set(["a"])}
        onExpandedChange={onExpandedChange}
        {...expansionProps()}
      />,
    );
    const toggle = screen.getByLabelText("Expand subtasks for Task A");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Details for Task A")).not.toBeNull();
    fireEvent.click(toggle);
    expect(onExpandedChange).toHaveBeenCalledWith(new Set());
  });
});

describe("DataTable row-click toggle (opt-in)", () => {
  it("does nothing on row click by default", () => {
    render(<DataTable columns={cols} rows={rows} {...expansionProps()} />);
    fireEvent.click(screen.getByText("Task A"));
    expect(screen.queryByText("Details for Task A")).toBeNull();
  });

  it("expands and collapses on task row click when opt-in", () => {
    render(<DataTable columns={cols} rows={rows} {...expansionProps()} expandOnRowClick />);
    fireEvent.click(screen.getByText("Task A"));
    expect(screen.getByText("Details for Task A")).not.toBeNull();
    expect(screen.getByLabelText("Expand subtasks for Task A").getAttribute("aria-expanded")).toBe(
      "true",
    );
    fireEvent.click(screen.getByText("Task A"));
    expect(screen.queryByText("Details for Task A")).toBeNull();
  });

  it("ignores clicks from interactive elements inside the row", () => {
    const actionCols: ColumnDef<TitleRow>[] = [
      { id: "title", name: "Title", isRowHeader: true },
      {
        id: "id",
        name: "Action",
        render: () => (
          <button type="button" aria-label="Row action">
            Act
          </button>
        ),
      },
    ];
    render(<DataTable columns={actionCols} rows={rows} {...expansionProps()} expandOnRowClick />);
    fireEvent.click(screen.getByLabelText("Row action"));
    expect(screen.queryByText("Details for Task A")).toBeNull();
  });

  it("never toggles from a child row click", () => {
    render(
      <DataTable
        columns={cols}
        rows={rows}
        expandedKeys={new Set(["a"])}
        getChildRows={() => [{ id: "a:1", title: "Child" }]}
        {...expansionProps()}
        expandOnRowClick
      />,
    );
    expect(screen.getByText("Child")).not.toBeNull();
    fireEvent.click(screen.getByText("Child"));
    expect(screen.getByText("Child")).not.toBeNull();
    expect(screen.getByText("Details for Task A")).not.toBeNull();
  });

  it("keeps the chevron as the only keyboard control", () => {
    render(<DataTable columns={cols} rows={rows} {...expansionProps()} expandOnRowClick />);
    const toggle = screen.getByLabelText("Expand subtasks for Task A");
    expect(toggle.tagName).toBe("BUTTON");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    const row = toggle.closest('[role="row"]');
    expect(row?.getAttribute("tabindex")).toBe("-1");
    if (row) fireEvent.keyDown(row, { key: "Enter" });
    expect(screen.queryByText("Details for Task A")).toBeNull();
  });
});

describe("DataTable child rows", () => {
  it("renders one row per child through the same columns, then the detail row", () => {
    const renderTitle = vi.fn((value: TitleRow[keyof TitleRow]) => <span>{String(value)}</span>);
    const childCols: ColumnDef<TitleRow>[] = [
      { id: "title", name: "Title", isRowHeader: true, render: renderTitle },
    ];
    render(
      <DataTable
        columns={childCols}
        rows={rows}
        expandedKeys={new Set(["a"])}
        getChildRows={(row) => (row.id === "a" ? [{ id: "a:1", title: "Child" }] : null)}
        {...expansionProps()}
      />,
    );
    expect(screen.getByText("Child")).not.toBeNull();
    expect(screen.getByText("Details for Task A")).not.toBeNull();
    expect(renderTitle).toHaveBeenCalledWith("Child", expect.objectContaining({ id: "a:1" }));
  });

  it("renders no child rows when collapsed", () => {
    render(
      <DataTable
        columns={cols}
        rows={rows}
        getChildRows={() => [{ id: "a:1", title: "Child" }]}
        {...expansionProps()}
      />,
    );
    expect(screen.queryByText("Child")).toBeNull();
    expect(screen.queryByText("Details for Task A")).toBeNull();
  });
});

describe("DataTable row class names", () => {
  it("applies getRowClassName to parent, child and detail rows", () => {
    const { container } = render(
      <DataTable
        columns={cols}
        rows={rows}
        expandedKeys={new Set(["a"])}
        getChildRows={(row) => (row.id === "a" ? [{ id: "a:1", title: "Child" }] : null)}
        getRowClassName={(entry) =>
          entry.child ? "child-row" : entry.detail ? "detail-row" : "parent-row"
        }
        {...expansionProps()}
      />,
    );
    const trs = container.querySelectorAll("tbody tr");
    expect(trs[0].className).toContain("parent-row");
    expect(trs[1].className).toContain("child-row");
    expect(trs[2].className).toContain("detail-row");
  });

  it("adds no custom row classes by default", () => {
    const { container } = render(<DataTable columns={cols} rows={rows} {...expansionProps()} />);
    expect(container.innerHTML).not.toContain("parent-row");
    expect(container.innerHTML).not.toContain("child-row");
    expect(container.innerHTML).not.toContain("detail-row");
  });
});
