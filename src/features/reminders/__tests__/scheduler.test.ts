import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { dispatchNotifications } from "@/features/notifications/dispatch";
import { getRoleRecipientIds } from "@/features/notifications/recipients";
import { NotificationType } from "@/generated/prisma/browser";
import { getOptionalInteger } from "@/lib/env";

import {
  claimConsultationReminder,
  claimMilestoneReminder,
  suppressMilestoneOverdue,
} from "../mutations";
import { getConsultationsNeedingReminder, getMilestonesNeedingReminder } from "../queries";
import { runReminderCheck } from "../scheduler";

vi.mock("@/lib/env", () => ({
  getOptionalInteger: vi.fn().mockReturnValue(3),
}));

vi.mock("../queries", () => ({
  getMilestonesNeedingReminder: vi.fn().mockResolvedValue([]),
  getConsultationsNeedingReminder: vi.fn().mockResolvedValue([]),
}));

vi.mock("../mutations", () => ({
  claimMilestoneReminder: vi.fn().mockResolvedValue(true),
  claimConsultationReminder: vi.fn().mockResolvedValue(true),
  suppressMilestoneOverdue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/notifications/dispatch", () => ({
  dispatchNotifications: vi.fn().mockResolvedValue({ count: 1 }),
}));

vi.mock("@/features/notifications/recipients", () => ({
  getRoleRecipientIds: vi.fn().mockResolvedValue(["u1"]),
}));

const callOrder: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  callOrder.length = 0;

  vi.mocked(getMilestonesNeedingReminder).mockResolvedValue([]);
  vi.mocked(getConsultationsNeedingReminder).mockResolvedValue([]);

  vi.mocked(dispatchNotifications).mockImplementation(async () => {
    callOrder.push("dispatch");
    return { count: 1 };
  });
  vi.mocked(claimMilestoneReminder).mockImplementation(async () => {
    callOrder.push("claimMilestone");
    return true;
  });
  vi.mocked(claimConsultationReminder).mockImplementation(async () => {
    callOrder.push("claimConsultation");
    return true;
  });
  vi.mocked(suppressMilestoneOverdue).mockImplementation(async () => {
    callOrder.push("suppressOverdue");
  });

  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-09T10:00:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

it("dispatches a due-soon milestone reminder before claiming it", async () => {
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
  expect(callOrder).toEqual(["dispatch", "claimMilestone"]);
  expect(suppressMilestoneOverdue).not.toHaveBeenCalled();
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

it("dispatches an overdue milestone once and suppresses it afterwards", async () => {
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
  expect(callOrder).toEqual(["dispatch", "suppressOverdue"]);
  expect(claimMilestoneReminder).not.toHaveBeenCalled();
});

it("leaves the milestone unclaimed when dispatch fails", async () => {
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

  expect(claimMilestoneReminder).not.toHaveBeenCalled();
  expect(suppressMilestoneOverdue).not.toHaveBeenCalled();
});

it("dispatches consultation reminders to role recipients before claiming", async () => {
  vi.mocked(getConsultationsNeedingReminder).mockResolvedValue([
    {
      id: "c1",
      concern: "Boundary dispute",
      booking_datetime: new Date("2026-08-12T10:00:00"),
      reminderDays: 3,
    },
  ]);

  await runReminderCheck();

  expect(getRoleRecipientIds).toHaveBeenCalledWith(NotificationType.ConsultationReminder);
  expect(dispatchNotifications).toHaveBeenCalledWith(
    expect.objectContaining({ type: NotificationType.ConsultationReminder }),
    expect.any(String),
  );
  expect(callOrder).toEqual(["dispatch", "claimConsultation"]);
});

it("skips consultations outside the reminder window", async () => {
  vi.mocked(getConsultationsNeedingReminder).mockResolvedValue([
    {
      id: "c1",
      concern: "Boundary dispute",
      booking_datetime: new Date("2026-08-20T10:00:00"),
      reminderDays: 3,
    },
  ]);

  await runReminderCheck();

  expect(dispatchNotifications).not.toHaveBeenCalled();
  expect(claimConsultationReminder).not.toHaveBeenCalled();
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
