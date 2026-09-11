"use client";

import { useState, useTransition } from "react";

import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import { Radio, RadioGroup } from "@/components/ui/RadioGroup/RadioGroup";
import { Select, SelectItem } from "@/components/ui/Select/Select";
import { updateDeadlineReminderPreferencesAction } from "@/features/settings/actions";
import { ReminderFrequency } from "@/generated/prisma/browser";
import { toastActionError, toastSuccess } from "@/lib/toast-utils";

import styles from "./DeadlineReminderForm.module.css";

const REMINDER_DAY_OPTIONS = [0, 1, 3, 5, 7, 14, 30] as const;

function formatReminderDay(value: number): string {
  if (value === 0) return "On due date";
  if (value === 1) return "1 day before";
  return `${value} days before`;
}

interface DeadlineReminderPreferences {
  consultation_reminder_days: number;
  consultation_reminder_frequency: "KeyDays" | "Daily";
  consultation_notify_overdue: boolean;
  milestone_reminder_days: number;
  milestone_reminder_frequency: "KeyDays" | "Daily";
  milestone_notify_overdue: boolean;
}

interface DeadlineReminderFormProps {
  initialPreferences: DeadlineReminderPreferences;
}

export function DeadlineReminderForm({ initialPreferences }: DeadlineReminderFormProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [isPending, startTransition] = useTransition();

  function patch(key: keyof DeadlineReminderPreferences, value: number | string | boolean) {
    const previous = preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: value }) as DeadlineReminderPreferences);

    startTransition(async () => {
      const res = await updateDeadlineReminderPreferencesAction({ [key]: value });
      if (!res.success) {
        setPreferences((prev) => ({ ...prev, [key]: previous }) as DeadlineReminderPreferences);
        toastActionError(res, "update notification preferences");
        return;
      }
      toastSuccess("Preferences updated", "Your reminder preferences have been saved.");
    });
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Deadline &amp; reminder schedule</h2>
        <p className={styles.description}>
          Configure how notifications are sent for upcoming dates.
        </p>
      </div>

      <div className={styles.sections}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Consultations</h3>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Start reminding me</span>
            <Select
              aria-label="Consultation reminder days"
              value={String(preferences.consultation_reminder_days)}
              onChange={(key) => {
                if (key != null) patch("consultation_reminder_days", Number(key as string));
              }}
              isDisabled={isPending}
              placeholder="Select days"
            >
              {REMINDER_DAY_OPTIONS.map((v) => (
                <SelectItem key={String(v)} id={String(v)} textValue={formatReminderDay(v)}>
                  {formatReminderDay(v)}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className={styles.fieldRow}>
            <RadioGroup
              label="Reminder frequency"
              value={preferences.consultation_reminder_frequency}
              onChange={(value) => patch("consultation_reminder_frequency", value as string)}
              isDisabled={isPending}
            >
              <Radio value={ReminderFrequency.KeyDays}>
                Key days only (Trigger day &amp; Day of booking)
              </Radio>
              <Radio value={ReminderFrequency.Daily}>Daily countdown until booking</Radio>
            </RadioGroup>
          </div>

          <Checkbox
            isSelected={preferences.consultation_notify_overdue}
            onChange={(v) => patch("consultation_notify_overdue", v)}
            isDisabled={isPending}
          >
            Send a single notification if the consultation is Overdue
          </Checkbox>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Case Milestones</h3>

          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Start reminding me</span>
            <Select
              aria-label="Milestone reminder days"
              value={String(preferences.milestone_reminder_days)}
              onChange={(key) => {
                if (key != null) patch("milestone_reminder_days", Number(key as string));
              }}
              isDisabled={isPending}
              placeholder="Select days"
            >
              {REMINDER_DAY_OPTIONS.map((v) => (
                <SelectItem key={String(v)} id={String(v)} textValue={formatReminderDay(v)}>
                  {formatReminderDay(v)}
                </SelectItem>
              ))}
            </Select>
          </div>

          <div className={styles.fieldRow}>
            <RadioGroup
              label="Reminder frequency"
              value={preferences.milestone_reminder_frequency}
              onChange={(value) => patch("milestone_reminder_frequency", value as string)}
              isDisabled={isPending}
            >
              <Radio value={ReminderFrequency.KeyDays}>
                Key days only (Trigger day &amp; Due date)
              </Radio>
              <Radio value={ReminderFrequency.Daily}>Daily countdown until deadline</Radio>
            </RadioGroup>
          </div>

          <Checkbox
            isSelected={preferences.milestone_notify_overdue}
            onChange={(v) => patch("milestone_notify_overdue", v)}
            isDisabled={isPending}
          >
            Send a single notification if milestone is Overdue
          </Checkbox>
        </div>
      </div>
    </section>
  );
}
