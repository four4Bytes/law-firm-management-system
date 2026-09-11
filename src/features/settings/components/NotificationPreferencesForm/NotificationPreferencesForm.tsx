"use client";

import { useState, useTransition } from "react";

import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import { updateNotificationPreferencesAction } from "@/features/settings/actions";
import { toastActionError, toastSuccess } from "@/lib/toast-utils";

import styles from "./NotificationPreferencesForm.module.css";

interface NotificationPreferencesFormProps {
  initialPreferences: {
    notify_email_case_assigned: boolean;
    notify_email_consultation_assigned: boolean;
    notify_email_task_assigned: boolean;
    notify_email_case_status_changed: boolean;
    notify_email_consultation_status_changed: boolean;
    notify_email_task_status_changed: boolean;
    notify_email_milestone_status_changed: boolean;
  };
}

export function NotificationPreferencesForm({
  initialPreferences,
}: NotificationPreferencesFormProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [isPending, startTransition] = useTransition();

  function handleToggle(
    key: keyof NotificationPreferencesFormProps["initialPreferences"],
    next: boolean,
  ) {
    const previous = preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: next }));

    startTransition(async () => {
      const res = await updateNotificationPreferencesAction({ [key]: next });
      if (!res.success) {
        setPreferences((prev) => ({ ...prev, [key]: previous }));
        toastActionError(res, "update notification preferences");
        return;
      }
      toastSuccess("Preferences updated", "Your notification preferences have been saved.");
    });
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Notifications</h2>
        <p className={styles.description}>Choose when you receive notifications</p>
      </div>

      <div className={styles.list}>
        <p className={styles.groupTitle}>Assignments</p>
        <Checkbox
          isSelected={preferences.notify_email_case_assigned}
          onChange={(v) => handleToggle("notify_email_case_assigned", v)}
          isDisabled={isPending}
          description="Receive a notification when you are assigned to a case"
        >
          Notify me when assigned to a case
        </Checkbox>

        <Checkbox
          isSelected={preferences.notify_email_consultation_assigned}
          onChange={(v) => handleToggle("notify_email_consultation_assigned", v)}
          isDisabled={isPending}
          description="Receive a notification when you are assigned to a consultation"
        >
          Notify me when assigned to a consultation
        </Checkbox>

        <Checkbox
          isSelected={preferences.notify_email_task_assigned}
          onChange={(v) => handleToggle("notify_email_task_assigned", v)}
          isDisabled={isPending}
          description="Receive a notification when you are assigned to a task"
        >
          Notify me when assigned to a task
        </Checkbox>

        <p className={styles.groupTitle}>Status changes</p>
        <Checkbox
          isSelected={preferences.notify_email_case_status_changed}
          onChange={(v) => handleToggle("notify_email_case_status_changed", v)}
          isDisabled={isPending}
          description="Receive a notification when a case you are assigned to changes status"
        >
          Notify me when a case status changes
        </Checkbox>

        <Checkbox
          isSelected={preferences.notify_email_consultation_status_changed}
          onChange={(v) => handleToggle("notify_email_consultation_status_changed", v)}
          isDisabled={isPending}
          description="Receive a notification when a consultation you are assigned to changes status"
        >
          Notify me when a consultation status changes
        </Checkbox>

        <Checkbox
          isSelected={preferences.notify_email_task_status_changed}
          onChange={(v) => handleToggle("notify_email_task_status_changed", v)}
          isDisabled={isPending}
          description="Receive a notification when a task you are assigned to or reviewing changes status"
        >
          Notify me when a task status changes
        </Checkbox>

        <Checkbox
          isSelected={preferences.notify_email_milestone_status_changed}
          onChange={(v) => handleToggle("notify_email_milestone_status_changed", v)}
          isDisabled={isPending}
          description="Receive a notification when a milestone in your case changes status"
        >
          Notify me when a milestone status changes
        </Checkbox>
      </div>
    </section>
  );
}
