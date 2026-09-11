import { describe, expect, it } from "vitest";

import {
  DeadlineReminderScheduleSchema,
  NotificationPreferencesSchema,
  UpdateDeadlineReminderScheduleSchema,
  UpdateNotificationPreferencesSchema,
} from "../schemas";

describe("NotificationPreferencesSchema", () => {
  it("accepts a valid full payload", () => {
    expect(
      NotificationPreferencesSchema.safeParse({
        notify_email_case_assigned: true,
        notify_email_consultation_assigned: false,
        notify_email_task_assigned: true,
        notify_email_case_status_changed: true,
        notify_email_consultation_status_changed: false,
        notify_email_task_status_changed: true,
        notify_email_milestone_status_changed: false,
      }).success,
    ).toBe(true);
  });

  it("rejects non-boolean values", () => {
    expect(
      NotificationPreferencesSchema.safeParse({
        notify_email_case_assigned: "true",
        notify_email_consultation_assigned: true,
        notify_email_task_assigned: true,
        notify_email_case_status_changed: true,
        notify_email_consultation_status_changed: true,
        notify_email_task_status_changed: true,
        notify_email_milestone_status_changed: true,
      } as unknown as never).success,
    ).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(
      NotificationPreferencesSchema.safeParse({ notify_email_case_assigned: true }).success,
    ).toBe(false);
  });

  it("rejects non-boolean status-change values", () => {
    expect(
      NotificationPreferencesSchema.safeParse({
        notify_email_case_assigned: true,
        notify_email_consultation_assigned: true,
        notify_email_task_assigned: true,
        notify_email_case_status_changed: "true",
        notify_email_consultation_status_changed: true,
        notify_email_task_status_changed: true,
        notify_email_milestone_status_changed: true,
      } as unknown as never).success,
    ).toBe(false);
  });
});

describe("UpdateNotificationPreferencesSchema", () => {
  it("accepts a single field patch", () => {
    expect(
      UpdateNotificationPreferencesSchema.safeParse({ notify_email_case_assigned: false }).success,
    ).toBe(true);
  });

  it("accepts multiple fields", () => {
    expect(
      UpdateNotificationPreferencesSchema.safeParse({
        notify_email_case_assigned: true,
        notify_email_task_assigned: false,
      }).success,
    ).toBe(true);
  });

  it("accepts all three fields", () => {
    expect(
      UpdateNotificationPreferencesSchema.safeParse({
        notify_email_case_assigned: true,
        notify_email_consultation_assigned: true,
        notify_email_task_assigned: true,
      }).success,
    ).toBe(true);
  });

  it("accepts all seven fields", () => {
    expect(
      UpdateNotificationPreferencesSchema.safeParse({
        notify_email_case_assigned: true,
        notify_email_consultation_assigned: true,
        notify_email_task_assigned: true,
        notify_email_case_status_changed: true,
        notify_email_consultation_status_changed: true,
        notify_email_task_status_changed: true,
        notify_email_milestone_status_changed: true,
      }).success,
    ).toBe(true);
  });

  it("accepts a single status-change field", () => {
    expect(
      UpdateNotificationPreferencesSchema.safeParse({
        notify_email_task_status_changed: false,
      }).success,
    ).toBe(true);
  });

  it("rejects an empty object", () => {
    expect(UpdateNotificationPreferencesSchema.safeParse({}).success).toBe(false);
  });

  it("rejects non-boolean values", () => {
    expect(
      UpdateNotificationPreferencesSchema.safeParse({
        notify_email_task_assigned: "false",
      } as unknown as never).success,
    ).toBe(false);
  });

  it("rejects unknown keys", () => {
    // zod strips unknown by default, but empty after strip still fails refine?
    // we keep strict behavior: unknown keys are stripped, so test ensures at least one known key required
    expect(UpdateNotificationPreferencesSchema.safeParse({ unknown: true }).success).toBe(false);
  });
});

describe("DeadlineReminderScheduleSchema", () => {
  const valid = {
    consultation_reminder_days: 3,
    consultation_reminder_frequency: "KeyDays" as const,
    consultation_notify_overdue: true,
    milestone_reminder_days: 5,
    milestone_reminder_frequency: "Daily" as const,
    milestone_notify_overdue: false,
  };

  it("accepts a valid full payload", () => {
    expect(DeadlineReminderScheduleSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts boundary 0 and 30", () => {
    expect(
      DeadlineReminderScheduleSchema.safeParse({
        ...valid,
        consultation_reminder_days: 0,
        milestone_reminder_days: 30,
      }).success,
    ).toBe(true);
  });

  it("rejects days above max 30", () => {
    expect(
      DeadlineReminderScheduleSchema.safeParse({ ...valid, consultation_reminder_days: 31 })
        .success,
    ).toBe(false);
  });

  it("rejects negative days", () => {
    expect(
      DeadlineReminderScheduleSchema.safeParse({
        ...valid,
        milestone_reminder_days: -1,
      } as unknown as never).success,
    ).toBe(false);
  });

  it("rejects non-integer days", () => {
    expect(
      DeadlineReminderScheduleSchema.safeParse({
        ...valid,
        consultation_reminder_days: 1.5,
      } as unknown as never).success,
    ).toBe(false);
  });

  it("rejects invalid enum", () => {
    expect(
      DeadlineReminderScheduleSchema.safeParse({
        ...valid,
        consultation_reminder_frequency: "Weekly",
      } as unknown as never).success,
    ).toBe(false);
  });

  it("rejects non-boolean overdue", () => {
    expect(
      DeadlineReminderScheduleSchema.safeParse({
        ...valid,
        consultation_notify_overdue: "true",
      } as unknown as never).success,
    ).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(
      DeadlineReminderScheduleSchema.safeParse({ consultation_reminder_days: 3 }).success,
    ).toBe(false);
  });
});

describe("UpdateDeadlineReminderScheduleSchema", () => {
  it("accepts a single field patch", () => {
    expect(
      UpdateDeadlineReminderScheduleSchema.safeParse({ consultation_reminder_days: 7 }).success,
    ).toBe(true);
  });

  it("accepts frequency patch", () => {
    expect(
      UpdateDeadlineReminderScheduleSchema.safeParse({ milestone_reminder_frequency: "Daily" })
        .success,
    ).toBe(true);
  });

  it("rejects empty object", () => {
    expect(UpdateDeadlineReminderScheduleSchema.safeParse({}).success).toBe(false);
  });

  it("rejects days above max via partial", () => {
    expect(
      UpdateDeadlineReminderScheduleSchema.safeParse({ consultation_reminder_days: 99 }).success,
    ).toBe(false);
  });

  it("rejects unknown keys only", () => {
    expect(
      UpdateDeadlineReminderScheduleSchema.safeParse({ unknown: true } as unknown as never).success,
    ).toBe(false);
  });
});
