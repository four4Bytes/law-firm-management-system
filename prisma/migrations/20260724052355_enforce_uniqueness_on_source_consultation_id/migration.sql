/*
  Warnings:

  - A unique constraint covering the columns `[source_consultation_id]` on the table `Case` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Case_source_consultation_id_key" ON "Case"("source_consultation_id");
