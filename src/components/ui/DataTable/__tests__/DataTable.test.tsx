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
