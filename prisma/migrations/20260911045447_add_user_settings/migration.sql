-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" UUID NOT NULL,
    "notify_email_case_assigned" BOOLEAN NOT NULL DEFAULT true,
    "notify_email_consultation_assigned" BOOLEAN NOT NULL DEFAULT true,
    "notify_email_task_assigned" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
