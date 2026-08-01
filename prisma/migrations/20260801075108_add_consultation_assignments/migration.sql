-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ConsultationAssigned';

-- CreateTable
CREATE TABLE "ConsultationAssignment" (
    "id" UUID NOT NULL,
    "consultation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationAssignment_consultation_id_user_id_key" ON "ConsultationAssignment"("consultation_id", "user_id");

-- AddForeignKey
ALTER TABLE "ConsultationAssignment" ADD CONSTRAINT "ConsultationAssignment_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationAssignment" ADD CONSTRAINT "ConsultationAssignment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
