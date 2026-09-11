import {
  getDeadlineReminderPreferencesAction,
  getNotificationPreferencesAction,
} from "@/features/settings/actions";
import { DeadlineReminderForm } from "@/features/settings/components/DeadlineReminderForm/DeadlineReminderForm";
import { NotificationPreferencesForm } from "@/features/settings/components/NotificationPreferencesForm/NotificationPreferencesForm";
import { requireAuth } from "@/lib/auth-guards";

import styles from "./page.module.css";

export default async function SettingsPage() {
  await requireAuth();

  const [preferences, deadlinePreferences] = await Promise.all([
    getNotificationPreferencesAction(),
    getDeadlineReminderPreferencesAction(),
  ]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.heading}>
        <p className={styles.subtitle}>Manage your account preferences.</p>
      </div>

      <NotificationPreferencesForm initialPreferences={preferences} />
      <DeadlineReminderForm initialPreferences={deadlinePreferences} />
    </div>
  );
}
