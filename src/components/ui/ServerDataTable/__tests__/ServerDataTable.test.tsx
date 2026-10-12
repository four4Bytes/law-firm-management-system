// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ServerDataTable } from "../ServerDataTable";

afterEach(cleanup);

interface TitleRow {
  id: string;
  title: string;
}

const cols = [{ id: "title" as const, name: "Title", isRowHeader: true }];

const rows: TitleRow[] = [{ id: "a", title: "Task A" }];

describe("ServerDataTable expansion passthrough", () => {
  it("forwards expansion props to DataTable and renders child rows", () => {
    render(
      <ServerDataTable
        fetchAction={vi.fn()}
        columns={cols}
        initialRows={rows}
        initialCursor={null}
        expandedKeys={new Set(["a"])}
        getChildRows={(row) => (row.id === "a" ? [{ id: "a:1", title: "Child" }] : null)}
        renderExpandedContent={(row) => <span>Details for {row.title}</span>}
        expandAriaLabel={(row) => `Expand subtasks for ${row.title}`}
      />,
    );
    const toggle = screen.getByLabelText("Expand subtasks for Task A");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Child")).not.toBeNull();
    expect(screen.getByText("Details for Task A")).not.toBeNull();
  });

  it("toggles expansion via onExpandedChange", () => {
    const onExpandedChange = vi.fn();
    render(
      <ServerDataTable
        fetchAction={vi.fn()}
        columns={cols}
        initialRows={rows}
        initialCursor={null}
        expandedKeys={new Set()}
        onExpandedChange={onExpandedChange}
        getChildRows={() => [{ id: "a:1", title: "Child" }]}
        renderExpandedContent={(row) => <span>Details for {row.title}</span>}
        expandAriaLabel={(row) => `Expand subtasks for ${row.title}`}
      />,
    );
    fireEvent.click(screen.getByLabelText("Expand subtasks for Task A"));
    expect(onExpandedChange).toHaveBeenCalledWith(new Set(["a"]));
  });
});

describe("ServerDataTable row-click toggle", () => {
  it("does nothing on row click by default", () => {
    render(
      <ServerDataTable
        fetchAction={vi.fn()}
        columns={cols}
        initialRows={rows}
        initialCursor={null}
        renderExpandedContent={(row) => <span>Details for {row.title}</span>}
        expandAriaLabel={(row) => `Expand subtasks for ${row.title}`}
      />,
    );
    fireEvent.click(screen.getByText("Task A"));
    expect(screen.queryByText("Details for Task A")).toBeNull();
  });

  it("forwards row-click expansion via onExpandedChange when opt-in", () => {
    const onExpandedChange = vi.fn();
    render(
      <ServerDataTable
        fetchAction={vi.fn()}
        columns={cols}
        initialRows={rows}
        initialCursor={null}
        expandedKeys={new Set()}
        onExpandedChange={onExpandedChange}
        renderExpandedContent={(row) => <span>Details for {row.title}</span>}
        expandAriaLabel={(row) => `Expand subtasks for ${row.title}`}
        expandOnRowClick
      />,
    );
    fireEvent.click(screen.getByText("Task A"));
    expect(onExpandedChange).toHaveBeenCalledWith(new Set(["a"]));
  });
});
