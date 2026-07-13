-- DropIndex
DROP INDEX "AuditLog_entity_type_entity_id_idx";

-- CreateIndex
CREATE INDEX "AuditLog_entity_type_entity_id_created_at_idx" ON "AuditLog"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "Case_created_at_idx" ON "Case"("created_at");

-- CreateIndex
CREATE INDEX "Case_status_idx" ON "Case"("status");

-- CreateIndex
CREATE INDEX "CaseMilestone_case_id_due_date_idx" ON "CaseMilestone"("case_id", "due_date");

-- CreateIndex
CREATE INDEX "CaseMilestone_status_due_date_idx" ON "CaseMilestone"("status", "due_date");

-- CreateIndex
CREATE INDEX "Consultation_booking_datetime_idx" ON "Consultation"("booking_datetime");

-- CreateIndex
CREATE INDEX "Consultation_status_booking_datetime_idx" ON "Consultation"("status", "booking_datetime");

-- CreateIndex
CREATE INDEX "Document_case_id_created_at_idx" ON "Document"("case_id", "created_at");

-- CreateIndex
CREATE INDEX "Document_consultation_id_created_at_idx" ON "Document"("consultation_id", "created_at");

-- CreateIndex
CREATE INDEX "Note_case_id_created_at_idx" ON "Note"("case_id", "created_at");

-- CreateIndex
CREATE INDEX "Note_consultation_id_created_at_idx" ON "Note"("consultation_id", "created_at");

-- CreateIndex
CREATE INDEX "Payment_case_id_payment_date_idx" ON "Payment"("case_id", "payment_date");

-- CreateIndex
CREATE INDEX "Payment_consultation_id_payment_date_idx" ON "Payment"("consultation_id", "payment_date");

-- CreateIndex
CREATE INDEX "Task_case_id_updated_at_idx" ON "Task"("case_id", "updated_at");

-- CreateIndex
CREATE INDEX "User_is_active_idx" ON "User"("is_active");

-- CreateIndex
CREATE INDEX "User_created_at_idx" ON "User"("created_at");
