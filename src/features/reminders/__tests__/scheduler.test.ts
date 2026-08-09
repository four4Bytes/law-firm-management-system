import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { dispatchNotifications } from "@/features/notifications/dispatch";
import { pruneNotifications } from "@/features/notifications/mutations";
import { NotificationType } from "@/generated/prisma/browser";
import { getOptionalInteger } from "@/lib/env";

import {
  claimConsultationReminder,
  claimMilestoneReminder,
  retractConsultationOverdue,
  retractMilestoneOverdue,
  suppressConsultationOverdue,
  suppressMilestoneOverdue,
  unclaimConsultationReminder,
  unclaimMilestoneReminder,
} from "../mutations";
import { getConsultationsNeedingReminder, getMilestonesNeedingReminder } from "../queries";
import { runReminderCheck } from "../scheduler";

vi.mock("@/lib/env", () => ({
  getOptionalInteger: vi.fn().mockReturnValue(3),
  getOptionalEnvVar: vi.fn().mockReturnValue("UTC"),
}));

vi.mock("../queries", () => ({
  getMilestonesNeedingReminder: vi.fn().mockResolvedValue([]),
  getConsultationsNeedingReminder: vi.fn().mockResolvedValue([]),
}));

vi.mock("../mutations", () => ({
  claimMilestoneReminder: vi.fn().mockResolvedValue(new Date("2026-08-09T10:00:00")),
  claimConsultationReminder: vi.fn().mockResolvedValue(new Date("2026-08-09T10:00:00")),
  unclaimMilestoneReminder: vi.fn().mockResolvedValue(undefined),
  unclaimConsultationReminder: vi.fn().mockResolvedValue(undefined),
  suppressMilestoneOverdue: vi.fn().mockResolvedValue(true),
  suppressConsultationOverdue: vi.fn().mockResolvedValue(true),
  retractMilestoneOverdue: vi.fn().mockResolvedValue(undefined),
  retractConsultationOverdue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/notifications/dispatch", () => ({
  dispatchNotifications: vi.fn().mockResolvedValue({ count: 1 }),
}));

vi.mock("@/features/notifications/mutations", () => ({
  pruneNotifications: vi.fn().mockResolvedValue(0),
}));

const callOrder: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  callOrder.length = 0;

  vi.mocked(getMilestonesNeedingReminder).mockResolvedValue([]);
  vi.mocked(getConsultationsNeedingReminder).mockResolvedValue([]);
  vi.mocked(getOptionalInteger).mockReturnValue(3);

  vi.mocked(dispatchNotifications).mockImplementation(async () => {
    callOrder.push("dispatch");
    return { count: 1 };
  });
  vi.mocked(claimMilestoneReminder).mockImplementation(async () => {
    callOrder.push("claimMilestone");
    return new Date("2026-08-09T10:00:00");
  });
  vi.mocked(claimConsultationReminder).mockImplementation(async () => {
    callOrder.push("claimConsultation");
    return new Date("2026-08-09T10:00:00");
  });
  vi.mocked(unclaimMilestoneReminder).mockImplementation(async () => {
    callOrder.push("unclaimMilestone");
  });
  vi.mocked(unclaimConsultationReminder).mockImplementation(async () => {
    callOrder.push("unclaimConsultation");
  });
  vi.mocked(suppressMilestoneOverdue).mockImplementation(async () => {
    callOrder.push("suppressMilestoneOverdue");
    return true;
  });
  vi.mocked(suppressConsultationOverdue).mockImplementation(async () => {
    callOrder.push("suppressConsultationOverdue");
    return true;
  });
  vi.mocked(retractMilestoneOverdue).mockImplementation(async () => {
    callOrder.push("retractMilestoneOverdue");
  });
  vi.mocked(retractConsultationOverdue).mockImplementation(async () => {
    callOrder.push("retractConsultationOverdue");
  });
  vi.mocked(pruneNotifications).mockImplementation(async () => {
    callOrder.push("prune");
    return 0;
  });

  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-09T10:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

it("prunes old notifications before processing reminders", async () => {
  await runReminderCheck();

  expect(pruneNotifications).toHaveBeenCalledWith(3);
  expect(callOrder).toEqual(["prune"]);
});

it("claims a due-soon milestone before dispatching its reminder", async () => {
  vi.mocked(getMilestonesNeedingReminder).mockResolvedValue([
    {
      id: "m1",
      title: "File complaint",
      due_date: new Date("2026-08-12T10:00:00"),
      caseId: "c1",
      assigneeIds: ["u1"],
      reminderDays: 3,
    },
  ]);

  await runReminderCheck();

  expect(dispatchNotifications).toHaveBeenCalledWith(
    expect.objectContaining({ type: NotificationType.MilestoneDueSoon }),
    expect.any(String),
  );
  expect(callOrder.slice(1)).toEqual(["claimMilestone", "dispatch"]);
  expect(suppressMilestoneOverdue).not.toHaveBeenCalled();
});

it("skips dispatch when another invocation already claimed the milestone", async () => {
  vi.mocked(getMilestonesNeedingReminder).mockResolvedValue([
    {
      id: "m1",
      title: "File complaint",
      due_date: new Date("2026-08-12T10:00:00"),
      caseId: "c1",
      assigneeIds: ["u1"],
      reminderDays: 3,
    },
  ]);
  vi.mocked(claimMilestoneReminder).mockResolvedValue(null);

  await runReminderCheck();

  expect(dispatchNotifications).not.toHaveBeenCalled();
});

it("skips milestones outside the reminder window", async () => {
  vi.mocked(getMilestonesNeedingReminder).mockResolvedValue([
    {
      id: "m1",
      title: "File complaint",
      due_date: new Date("2026-08-20T10:00:00"),
      caseId: "c1",
      assigneeIds: ["u1"],
      reminderDays: 3,
    },
  ]);

  await runReminderCheck();

  expect(dispatchNotifications).not.toHaveBeenCalled();
  expect(claimMilestoneReminder).not.toHaveBeenCalled();
});

it("skips milestones without assignees", async () => {
  vi.mocked(getMilestonesNeedingReminder).mockResolvedValue([
    {
      id: "m1",
      title: "File complaint",
      due_date: new Date("2026-08-12T10:00:00"),
      caseId: "c1",
      assigneeIds: [],
      reminderDays: 3,
    },
  ]);

  await runReminderCheck();

  expect(dispatchNotifications).not.toHaveBeenCalled();
});

it("suppresses an overdue milestone before dispatching its reminder", async () => {
  vi.mocked(getMilestonesNeedingReminder).mockResolvedValue([
    {
      id: "m1",
      title: "File complaint",
      due_date: new Date("2026-08-01T10:00:00"),
      caseId: "c1",
      assigneeIds: ["u1"],
      reminderDays: 3,
    },
  ]);

  await runReminderCheck();

  expect(dispatchNotifications).toHaveBeenCalledWith(
    expect.objectContaining({ type: NotificationType.MilestoneOverdue }),
    expect.any(String),
  );
  expect(callOrder.slice(1)).toEqual(["suppressMilestoneOverdue", "dispatch"]);
  expect(claimMilestoneReminder).not.toHaveBeenCalled();
});

it("skips dispatch when another invocation already suppressed the overdue milestone", async () => {
  vi.mocked(getMilestonesNeedingReminder).mockResolvedValue([
    {
      id: "m1",
      title: "File complaint",
      due_date: new Date("2026-08-01T10:00:00"),
      caseId: "c1",
      assigneeIds: ["u1"],
      reminderDays: 3,
    },
  ]);
  vi.mocked(suppressMilestoneOverdue).mockResolvedValue(false);

  await runReminderCheck();

  expect(dispatchNotifications).not.toHaveBeenCalled();
});

it("releases the milestone claim when dispatch fails", async () => {
  vi.mocked(getMilestonesNeedingReminder).mockResolvedValue([
    {
      id: "m1",
      title: "File complaint",
      due_date: new Date("2026-08-12T10:00:00"),
      caseId: "c1",
      assigneeIds: ["u1"],
      reminderDays: 3,
    },
  ]);
  vi.mocked(dispatchNotifications).mockRejectedValue(new Error("smtp down"));

  await runReminderCheck();

  expect(unclaimMilestoneReminder).toHaveBeenCalledWith("m1", new Date("2026-08-09T10:00:00"));
});

it("retracts an overdue milestone suppression when dispatch fails", async () => {
  vi.mocked(getMilestonesNeedingReminder).mockResolvedValue([
    {
      id: "m1",
      title: "File complaint",
      due_date: new Date("2026-08-01T10:00:00"),
      caseId: "c1",
      assigneeIds: ["u1"],
      reminderDays: 3,
    },
  ]);
  vi.mocked(dispatchNotifications).mockRejectedValue(new Error("smtp down"));

  await runReminderCheck();

  expect(retractMilestoneOverdue).toHaveBeenCalledWith("m1");
});

it("claims a due-soon consultation before dispatching to assignees", async () => {
  vi.mocked(getConsultationsNeedingReminder).mockResolvedValue([
    {
      id: "c1",
      concern: "Boundary dispute",
      booking_datetime: new Date("2026-08-12T10:00:00"),
      reminderDays: 3,
      assigneeIds: ["u1", "u2"],
    },
  ]);

  await runReminderCheck();

  expect(dispatchNotifications).toHaveBeenCalledWith(
    expect.objectContaining({
      type: NotificationType.ConsultationReminder,
      userIds: ["u1", "u2"],
    }),
    expect.any(String),
  );
  expect(callOrder.slice(1)).toEqual(["claimConsultation", "dispatch"]);
  expect(suppressConsultationOverdue).not.toHaveBeenCalled();
});

it("skips when another invocation already claimed the consultation", async () => {
  vi.mocked(getConsultationsNeedingReminder).mockResolvedValue([
    {
      id: "c1",
      concern: "Boundary dispute",
      booking_datetime: new Date("2026-08-12T10:00:00"),
      reminderDays: 3,
      assigneeIds: ["u1"],
    },
  ]);
  vi.mocked(claimConsultationReminder).mockResolvedValue(null);

  await runReminderCheck();

  expect(dispatchNotifications).not.toHaveBeenCalled();
});

it("skips consultations outside the reminder window", async () => {
  vi.mocked(getConsultationsNeedingReminder).mockResolvedValue([
    {
      id: "c1",
      concern: "Boundary dispute",
      booking_datetime: new Date("2026-08-20T10:00:00"),
      reminderDays: 3,
      assigneeIds: ["u1"],
    },
  ]);

  await runReminderCheck();

  expect(dispatchNotifications).not.toHaveBeenCalled();
  expect(claimConsultationReminder).not.toHaveBeenCalled();
});

it("skips consultations without assignees", async () => {
  vi.mocked(getConsultationsNeedingReminder).mockResolvedValue([
    {
      id: "c1",
      concern: "Boundary dispute",
      booking_datetime: new Date("2026-08-12T10:00:00"),
      reminderDays: 3,
      assigneeIds: [],
    },
  ]);

  await runReminderCheck();

  expect(dispatchNotifications).not.toHaveBeenCalled();
  expect(claimConsultationReminder).not.toHaveBeenCalled();
});

it("suppresses an overdue consultation before dispatching its reminder", async () => {
  vi.mocked(getConsultationsNeedingReminder).mockResolvedValue([
    {
      id: "c1",
      concern: "Boundary dispute",
      booking_datetime: new Date("2026-08-01T10:00:00"),
      reminderDays: 3,
      assigneeIds: ["u1"],
    },
  ]);

  await runReminderCheck();

  expect(dispatchNotifications).toHaveBeenCalledWith(
    expect.objectContaining({ type: NotificationType.ConsultationOverdue }),
    expect.any(String),
  );
  expect(callOrder.slice(1)).toEqual(["suppressConsultationOverdue", "dispatch"]);
  expect(claimConsultationReminder).not.toHaveBeenCalled();
});

it("skips dispatch when another invocation already suppressed the consultation", async () => {
  vi.mocked(getConsultationsNeedingReminder).mockResolvedValue([
    {
      id: "c1",
      concern: "Boundary dispute",
      booking_datetime: new Date("2026-08-01T10:00:00"),
      reminderDays: 3,
      assigneeIds: ["u1"],
    },
  ]);
  vi.mocked(suppressConsultationOverdue).mockResolvedValue(false);

  await runReminderCheck();

  expect(dispatchNotifications).not.toHaveBeenCalled();
});

it("releases the consultation claim when dispatch fails", async () => {
  vi.mocked(getConsultationsNeedingReminder).mockResolvedValue([
    {
      id: "c1",
      concern: "Boundary dispute",
      booking_datetime: new Date("2026-08-12T10:00:00"),
      reminderDays: 3,
      assigneeIds: ["u1"],
    },
  ]);
  vi.mocked(dispatchNotifications).mockRejectedValue(new Error("smtp down"));

  await runReminderCheck();

  expect(unclaimConsultationReminder).toHaveBeenCalledWith("c1", new Date("2026-08-09T10:00:00"));
});

it("retracts an overdue consultation suppression when dispatch fails", async () => {
  vi.mocked(getConsultationsNeedingReminder).mockResolvedValue([
    {
      id: "c1",
      concern: "Boundary dispute",
      booking_datetime: new Date("2026-08-01T10:00:00"),
      reminderDays: 3,
      assigneeIds: ["u1"],
    },
  ]);
  vi.mocked(dispatchNotifications).mockRejectedValue(new Error("smtp down"));

  await runReminderCheck();

  expect(retractConsultationOverdue).toHaveBeenCalledWith("c1");
});

it("uses the env default when reminder_days is not set", async () => {
  vi.mocked(getMilestonesNeedingReminder).mockResolvedValue([
    {
      id: "m1",
      title: "File complaint",
      due_date: new Date("2026-08-12T10:00:00"),
      caseId: "c1",
      assigneeIds: ["u1"],
      reminderDays: null,
    },
  ]);
  vi.mocked(getOptionalInteger).mockReturnValue(3);

  await runReminderCheck();

  expect(dispatchNotifications).toHaveBeenCalledWith(
    expect.objectContaining({ type: NotificationType.MilestoneDueSoon }),
    expect.any(String),
  );
});
