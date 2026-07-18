import { z } from "zod";

import { PaymentStatus } from "@/generated/prisma/browser";
import { optionalText, positiveNumber, requiredEnum } from "@/lib/form-utils";
import { exactlyOneParentRefinement } from "@/lib/schemas";

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
