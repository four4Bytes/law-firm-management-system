// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable, type ColumnDef } from "@/components/ui/DataTable/DataTable";
import { getTaskDetailRowByIdAction } from "@/features/tasks/actions";
import type { TaskDetailRow } from "@/features/tasks/queries";
import { SubtaskStatus, TaskAssignmentStatus, TaskStatus } from "@/generated/prisma/browser";

import type { SubtaskDetailRow, SubtaskRow } from "../../../queries";
import {
  childRowsForTask,
  SubtaskCountPill,
  SubtaskExpandedContent,
  SubtaskRowActions,
  SubtaskTitleCell,
  TaskSubtaskRows,
  toSubtaskChildRow,
} from "../TaskSubtaskRows";
import styles from "../TaskSubtaskRows.module.css";

afterEach(cleanup);

vi.mock("@/features/tasks/actions", () => ({
  getTaskDetailRowByIdAction: vi.fn().mockResolvedValue({ row: null }),
}));

vi.mock("@/features/subtasks/actions", () => ({
  createSubtaskAction: vi.fn(),
  updateSubtaskAction: vi.fn(),
}));

const subtask: SubtaskRow = {
  id: "st1",
  title: "File motion",
  status: SubtaskStatus.Pending,
  due_date: new Date("2026-12-01T09:00:00+08:00"),
  created_at: new Date("2026-10-01T09:00:00+08:00"),
  assignTo: "Alice",
};

function parentDetailResult(title: string | null) {
  const row: TaskDetailRow | null =
    title === null
      ? null
      : {
          id: "t1",
          title,
          description: null,
          status: TaskStatus.Pending,
          due_date: null,
          updated_at: new Date("2026-10-01T09:00:00+08:00"),
          created_at: new Date("2026-10-01T09:00:00+08:00"),
          created_by_user_id: "u9",
          assignTo: [{ id: "u1", name: "Alice", status: TaskAssignmentStatus.Todo }],
          assignee_ids: ["u1"],
          reviewers: [],
        };
  return {
    row,
    canUpdate: false,
    capabilities: {
      isCreator: false,
      isReviewer: false,
      canSubmit: false,
      canReview: false,
      canManageReviewers: false,
      canEdit: false,
      canEditRoster: false,
      canReopen: false,
    },
    currentUserId: "u9",
  };
}

describe("toSubtaskChildRow", () => {
  it("keys the child id by parent and carries every column field", () => {
    const child = toSubtaskChildRow({ taskId: "t1", subtask, parentReviewers: "Bob" });
    expect(child.id).toBe("t1:st1");
    expect(child.kind).toBe("subtask");
    expect(child.taskId).toBe("t1");
    expect(child.subtaskId).toBe("st1");
    expect(child.title).toBe("File motion");
    expect(child.status).toBe(SubtaskStatus.Pending);
    expect(child.due_date).toEqual(subtask.due_date);
    expect(child.assignTo).toBe("Alice");
    expect(child.reviewers).toBe("Bob");
  });

  it("falls back to a dash when the parent has no reviewers", () => {
    const child = toSubtaskChildRow({ taskId: "t1", subtask, parentReviewers: "" });
    expect(child.reviewers).toBe("–");
  });
});

describe("childRowsForTask", () => {
  it("returns null before subtasks load", () => {
    expect(
      childRowsForTask({ taskId: "t1", subtasks: undefined, parentReviewers: "Bob" }),
    ).toBeNull();
  });

  it("maps loaded subtasks to child rows", () => {
    expect(childRowsForTask({ taskId: "t1", subtasks: [subtask], parentReviewers: "Bob" })).toEqual(
      [toSubtaskChildRow({ taskId: "t1", subtask, parentReviewers: "Bob" })],
    );
  });
});

describe("SubtaskCountPill", () => {
  it("shows the count when subtasks exist", () => {
    render(<SubtaskCountPill count={2} />);
    const pill = screen.getByText("2 subtasks");
    expect(pill.className).toContain(styles.countPill);
  });

  it("singularizes a single subtask", () => {
    render(<SubtaskCountPill count={1} />);
    expect(screen.getByText("1 subtask")).not.toBeNull();
  });

  it("renders no pill element when there are no subtasks", () => {
    const { container } = render(<SubtaskCountPill count={0} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("SubtaskTitleCell", () => {
  it("renders the title for the child row", () => {
    render(<SubtaskTitleCell title="File motion" status={SubtaskStatus.Pending} />);
    expect(screen.getByText("File motion")).not.toBeNull();
  });

  it("shows an empty-circle marker for To Do and a check marker for Done", () => {
    const { container: pending } = render(
      <SubtaskTitleCell title="Same title" status={SubtaskStatus.Pending} />,
    );
    const { container: done } = render(
      <SubtaskTitleCell title="Same title" status={SubtaskStatus.Done} />,
    );
    expect(pending.querySelector("svg")).not.toBeNull();
    expect(done.querySelector("svg")).not.toBeNull();
    expect(pending.innerHTML).not.toBe(done.innerHTML);
  });

  it("mutes a Done subtask title", () => {
    const { container } = render(<SubtaskTitleCell title="B" status={SubtaskStatus.Done} />);
    expect(container.innerHTML).toContain(styles.doneTitle);
  });
});

describe("SubtaskRowActions", () => {
  it("always renders edit and delete, and fires both handlers", () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<SubtaskRowActions subtaskId="st1" onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText("Edit subtask"));
    fireEvent.click(screen.getByLabelText("Delete subtask"));
    expect(onEdit).toHaveBeenCalledWith("st1");
    expect(onDelete).toHaveBeenCalledWith("st1");
  });
});

describe("SubtaskExpandedContent", () => {
  it("shows loading before subtasks arrive", () => {
    render(<SubtaskExpandedContent taskId="t1" subtasks={undefined} canAdd onAdd={() => {}} />);
    expect(screen.getByText("Loading subtasks...")).not.toBeNull();
  });

  it("shows the empty state plus Add when there are no subtasks", () => {
    const onAdd = vi.fn();
    render(<SubtaskExpandedContent taskId="t1" subtasks={[]} canAdd onAdd={onAdd} />);
    expect(screen.getByText("No subtasks yet")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add subtask" }));
    expect(onAdd).toHaveBeenCalledWith("t1");
  });

  it("shows only the trailing Add button when subtasks exist", () => {
    const onAdd = vi.fn();
    render(<SubtaskExpandedContent taskId="t1" subtasks={[subtask]} canAdd onAdd={onAdd} />);
    expect(screen.queryByText("No subtasks yet")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add subtask" }));
    expect(onAdd).toHaveBeenCalledWith("t1");
  });

  it("hides Add when creation is not allowed", () => {
    render(<SubtaskExpandedContent taskId="t1" subtasks={[]} canAdd={false} onAdd={() => {}} />);
    expect(screen.queryByRole("button", { name: "Add subtask" })).toBeNull();
  });

  it.each([[{ subtasks: [] as SubtaskRow[] }], [{ subtasks: [subtask] }]])(
    "renders exactly one Add button (%#)",
    ({ subtasks }) => {
      render(<SubtaskExpandedContent taskId="t1" subtasks={subtasks} canAdd onAdd={() => {}} />);
      expect(screen.getAllByRole("button", { name: "Add subtask" })).toHaveLength(1);
    },
  );
});

type TaskTableTestRow =
  { id: string; kind: "task"; title: string } | { id: string; kind: "subtask"; title: string };

describe("child rows through the shared column pipeline", () => {
  it("passes each child row to the same column render as parents", () => {
    const renderTitle = vi.fn((value: TaskTableTestRow[keyof TaskTableTestRow]) => (
      <span>{String(value)}</span>
    ));
    const columns: ColumnDef<TaskTableTestRow>[] = [
      { id: "title", name: "Title", isRowHeader: true, render: renderTitle },
    ];
    const parent: TaskTableTestRow = { id: "t1", kind: "task", title: "Parent" };
    const child: TaskTableTestRow = { id: "t1:st1", kind: "subtask", title: "File motion" };
    render(
      <DataTable
        columns={columns}
        rows={[parent]}
        expandedKeys={new Set(["t1"])}
        getChildRows={() => [child]}
        renderExpandedContent={() => <span>details</span>}
        expandAriaLabel={(row) => `Expand subtasks for ${row.title}`}
      />,
    );
    expect(screen.getByText("File motion")).not.toBeNull();
    expect(renderTitle).toHaveBeenCalledWith("File motion", child);
  });
});

const detailRow: SubtaskDetailRow = {
  id: "st1",
  task_id: "t1",
  title: "File motion",
  description: null,
  status: SubtaskStatus.Pending,
  due_date: new Date("2026-12-01T09:00:00+08:00"),
  created_by_user_id: "u1",
  created_at: new Date("2026-10-01T09:00:00+08:00"),
  updated_at: new Date("2026-10-01T09:00:00+08:00"),
  assignTo: [],
  assignee_ids: [],
  case_id: "c1",
};

function modalProps() {
  return {
    addTaskId: null as string | null,
    onAddOpenChange: () => {},
    onAddSuccess: () => {},
    editSubtask: null as SubtaskDetailRow | null,
    onEditOpenChange: () => {},
    onEditSuccess: () => {},
    deleteTarget: null as { taskId: string; row: SubtaskRow } | null,
    onDeleteOpenChange: () => {},
    onDeleteConfirm: () => {},
    users: [],
  };
}

describe("TaskSubtaskRows", () => {
  it("mounts the Add modal for the chosen task", () => {
    render(<TaskSubtaskRows {...modalProps()} addTaskId="t1" />);
    expect(screen.getByText("Add Subtask")).not.toBeNull();
  });

  it("mounts the Edit modal for the chosen subtask", () => {
    render(<TaskSubtaskRows {...modalProps()} editSubtask={detailRow} />);
    expect(screen.getByText("Edit Subtask")).not.toBeNull();
  });

  it("confirms delete naming both subtask and parent task", async () => {
    vi.mocked(getTaskDetailRowByIdAction).mockResolvedValue(parentDetailResult("Wala"));
    const onDeleteConfirm = vi.fn();
    render(
      <TaskSubtaskRows
        {...modalProps()}
        deleteTarget={{ taskId: "t1", row: subtask }}
        onDeleteConfirm={onDeleteConfirm}
      />,
    );
    expect(
      await screen.findByText(
        '"File motion" will be permanently deleted. The parent task Wala is not changed.',
      ),
    ).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Delete subtask" }));
    expect(onDeleteConfirm).toHaveBeenCalled();
  });

  it("falls back to generic copy when the parent title is unavailable", async () => {
    vi.mocked(getTaskDetailRowByIdAction).mockResolvedValue(parentDetailResult(null));
    render(<TaskSubtaskRows {...modalProps()} deleteTarget={{ taskId: "t1", row: subtask }} />);
    expect(
      await screen.findByText(
        '"File motion" will be permanently deleted. The parent task is not changed.',
      ),
    ).not.toBeNull();
  });
});
