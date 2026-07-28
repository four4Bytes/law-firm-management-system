import { z } from "zod";

import { PaymentStatus } from "@/generated/prisma/browser";
import { optionalText, positiveNumber, requiredEnum } from "@/lib/form-utils";
import { exactlyOneParentRefinement, SortQuerySchema } from "@/lib/schemas";

export const PaymentPageQuerySchema = z.object({
  caseId: z.uuid().optional(),
  consultationId: z.uuid().optional(),
  search: z.string().trim().max(500).optional().default(""),
  cursor: z.uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: SortQuerySchema.optional(),
});

export const PaymentIdSchema = z.object({
  paymentId: z.uuid(),
});

export const PaymentCreatePayloadSchema = z
  .object({
    amount: positiveNumber(9999999999.99, "Amount"),
    payment_date: z.coerce.date(),
    status: requiredEnum(PaymentStatus, "Status"),
    payment_method: optionalText(100, "Payment method", true),
    receipt_number: optionalText(100, "Receipt number", true),
    case_id: z.uuid().nullable().optional(),
    consultation_id: z.uuid().nullable().optional(),
  })
  .refine(exactlyOneParentRefinement, {
    message: "Provide exactly one of case_id or consultation_id",
  });

export const PaymentUpdatePayloadSchema = z.object({
  paymentId: z.uuid(),
  amount: positiveNumber(9999999999.99, "Amount"),
  payment_date: z.coerce.date(),
  status: requiredEnum(PaymentStatus, "Status"),
  payment_method: optionalText(100, "Payment method", true),
  receipt_number: optionalText(100, "Receipt number", true),
});
