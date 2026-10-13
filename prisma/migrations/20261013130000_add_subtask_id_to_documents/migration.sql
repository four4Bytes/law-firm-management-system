-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "subtask_id" UUID;

-- CreateIndex
CREATE INDEX "Document_subtask_id_created_at_idx" ON "Document"("subtask_id", "created_at");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_subtask_id_fkey" FOREIGN KEY ("subtask_id") REFERENCES "Subtask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
