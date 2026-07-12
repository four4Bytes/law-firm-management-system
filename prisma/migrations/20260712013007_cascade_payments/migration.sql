-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_consultation_id_fkey";

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
