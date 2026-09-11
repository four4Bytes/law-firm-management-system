import { getNotificationPreferencesAction } from "@/features/settings/actions";
import { NotificationPreferencesForm } from "@/features/settings/components/NotificationPreferencesForm/NotificationPreferencesForm";
import { requireAuth } from "@/lib/auth-guards";

import styles from "./page.module.css";

export default async function SettingsPage() {
  await requireAuth();

  const preferences = await getNotificationPreferencesAction();

  return (
    <div className={styles.wrapper}>
      <div className={styles.heading}>
        <p className={styles.subtitle}>Manage your account preferences.</p>
      </div>

      <NotificationPreferencesForm initialPreferences={preferences} />
    </div>
  );
}
