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
      toastSuccess("Preferences updated", "Your email notification preferences have been saved.");
    });
  }

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Email notifications</h2>
        <p className={styles.description}>Choose when you receive email notifications</p>
      </div>

      <div className={styles.list}>
        <Checkbox
          isSelected={preferences.notify_email_case_assigned}
          onChange={(v) => handleToggle("notify_email_case_assigned", v)}
          isDisabled={isPending}
          description="Receive an email when you are assigned to a case"
        >
          Notify me when assigned to a case
        </Checkbox>

        <Checkbox
          isSelected={preferences.notify_email_consultation_assigned}
          onChange={(v) => handleToggle("notify_email_consultation_assigned", v)}
          isDisabled={isPending}
          description="Receive an email when you are assigned to a consultation"
        >
          Notify me when assigned to a consultation
        </Checkbox>

        <Checkbox
          isSelected={preferences.notify_email_task_assigned}
          onChange={(v) => handleToggle("notify_email_task_assigned", v)}
          isDisabled={isPending}
          description="Receive an email when you are assigned to a task"
        >
          Notify me when assigned to a task
        </Checkbox>
      </div>

      <p className={styles.hint}>
        These settings only affect email notifications. You will always see assignments in-app.
      </p>
    </section>
  );
}
