import { z } from "zod";

import { PaymentStatus } from "@/generated/prisma/client";
import { exactlyOneParentRefinement } from "@/lib/schemas";

export const PaymentIdSchema = z.object({
  paymentId: z.uuid(),
});

export const PaymentCreatePayloadSchema = z
  .object({
    amount: z.coerce.number().positive().max(9999999999.99),
    payment_date: z.coerce.date(),
    status: z.enum(PaymentStatus),
    payment_method: z.string().trim().max(100).optional().default(""),
    receipt_number: z.string().trim().max(100).optional().default(""),
    case_id: z.uuid().nullable().optional(),
    consultation_id: z.uuid().nullable().optional(),
  })
  .refine(exactlyOneParentRefinement, {
    message: "Provide exactly one of case_id or consultation_id",
  });

export const PaymentUpdatePayloadSchema = z.object({
  paymentId: z.uuid(),
  amount: z.coerce.number().positive().max(9999999999.99),
  payment_date: z.coerce.date(),
  status: z.enum(PaymentStatus),
  payment_method: z.string().trim().max(100).optional().default(""),
  receipt_number: z.string().trim().max(100).optional().default(""),
});
