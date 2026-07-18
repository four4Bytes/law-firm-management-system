-- AlterTable
ALTER TABLE "CaseMilestone" ADD COLUMN     "last_reminded_at" TIMESTAMP(3),
ADD COLUMN     "reminder_days" INTEGER;

-- AlterTable
ALTER TABLE "Consultation" ADD COLUMN     "last_reminded_at" TIMESTAMP(3),
ADD COLUMN     "reminder_days" INTEGER;
