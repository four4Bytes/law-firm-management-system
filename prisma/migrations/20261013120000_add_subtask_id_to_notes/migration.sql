-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "subtask_id" UUID;

-- CreateIndex
CREATE INDEX "Note_subtask_id_created_at_idx" ON "Note"("subtask_id", "created_at");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_subtask_id_fkey" FOREIGN KEY ("subtask_id") REFERENCES "Subtask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
