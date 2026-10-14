import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  statusChangeTemplate,
  subtaskAssignedTemplate,
  subtaskCompletedTemplate,
  taskAssignedTemplate,
  type TemplateContext,
} from "@/lib/messaging/email-templates";

beforeEach(() => {
  vi.stubEnv("APP_ORIGIN", "https://app.example.test");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function subtaskContext(): TemplateContext {
  return {
    toName: "Alice",
    actorName: "Bob",
    title: "Subtask assigned: File motion · Parent task · Rivera Case",
    message:
      'You have been assigned subtask "File motion" under parent task "Parent task" in case "Rivera Case", due Dec 1, 2026 at 09:00 AM.',
    actionUrl: "/case/c1?tab=tasks",
    subtaskTitle: "File motion",
    parentTitle: "Parent task",
    caseName: "Rivera Case",
    dueDateLabel: "Dec 1, 2026 at 09:00 AM",
  };
}

describe("subtaskAssignedTemplate", () => {
  it("renders the subtask heading, names, and tasks link", () => {
    const html = subtaskAssignedTemplate(subtaskContext());

    expect(html).toContain("Subtask Assigned");
    expect(html).toContain("File motion");
    expect(html).toContain("Parent task");
    expect(html).toContain("Rivera Case");
    expect(html).toContain("/case/c1?tab=tasks");
  });

  it("falls back to title and message when optional fields are absent", () => {
    const html = subtaskAssignedTemplate({
      toName: "Alice",
      actorName: "Bob",
      title: "Subtask assigned: File motion",
      message: "You have been assigned a subtask.",
    });

    expect(html).toContain("Subtask Assigned");
    expect(html).toContain("Subtask assigned: File motion");
    expect(html).toContain("You have been assigned a subtask.");
  });
});

describe("subtaskCompletedTemplate", () => {
  it("renders the completion heading, names, and tasks link", () => {
    const html = subtaskCompletedTemplate(subtaskContext());

    expect(html).toContain("Subtask Completed");
    expect(html).toContain("File motion");
    expect(html).toContain("Parent task");
    expect(html).toContain("Rivera Case");
    expect(html).toContain("/case/c1?tab=tasks");
  });
});

describe("existing templates", () => {
  it("keeps the task assigned output unchanged", () => {
    const html = taskAssignedTemplate({
      toName: "Alice",
      actorName: "Bob",
      title: "Task assigned: Draft brief",
      message: "You have been assigned to a task.",
      actionUrl: "/case/c1",
    });

    expect(html).toContain("Task Assigned");
    expect(html).toContain("Draft brief");
    expect(html).toContain("/case/c1");
  });

  it("keeps the status change output unchanged", () => {
    const html = statusChangeTemplate({
      toName: "Alice",
      actorName: "Bob",
      title: "Task completed: Draft brief",
      message: "Transitioned to Done.",
      actionUrl: "/case/c1",
    });

    expect(html).toContain("Task completed: Draft brief");
    expect(html).toContain("Transitioned to Done.");
  });
});
