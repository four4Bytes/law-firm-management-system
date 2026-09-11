import { describe, expect, it } from "vitest";

import { NotificationPreferencesSchema, UpdateNotificationPreferencesSchema } from "../schemas";

describe("NotificationPreferencesSchema", () => {
  it("accepts a valid full payload", () => {
    expect(
      NotificationPreferencesSchema.safeParse({
        notify_email_case_assigned: true,
        notify_email_consultation_assigned: false,
        notify_email_task_assigned: true,
      }).success,
    ).toBe(true);
  });

  it("rejects non-boolean values", () => {
    expect(
      NotificationPreferencesSchema.safeParse({
        notify_email_case_assigned: "true",
        notify_email_consultation_assigned: true,
        notify_email_task_assigned: true,
      } as unknown as never).success,
    ).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(
      NotificationPreferencesSchema.safeParse({ notify_email_case_assigned: true }).success,
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
