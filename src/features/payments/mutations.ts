import { type PaymentStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export interface PaymentCreateData {
  amount: number;
  payment_date: Date;
  status: PaymentStatus;
  payment_method?: string | null;
  receipt_number?: string | null;
  case_id?: string | null;
  consultation_id?: string | null;
  created_by_user_id: string;
}

export async function createPayment(data: PaymentCreateData): Promise<{ id: string }> {
  return prisma.payment.create({
    data: {
      amount: data.amount,
      payment_date: data.payment_date,
      status: data.status,
      payment_method: data.payment_method || null,
      receipt_number: data.receipt_number || null,
      case_id: data.case_id || null,
      consultation_id: data.consultation_id || null,
      created_by_user_id: data.created_by_user_id,
    },
    select: { id: true },
  });
}

export async function updatePayment(
  id: string,
  data: {
    amount: number;
    payment_date: Date;
    status: PaymentStatus;
    payment_method?: string | null;
    receipt_number?: string | null;
  },
): Promise<{ id: string }> {
  return prisma.payment.update({
    where: { id },
    data: {
      amount: data.amount,
      payment_date: data.payment_date,
      status: data.status,
      payment_method: data.payment_method || null,
      receipt_number: data.receipt_number || null,
    },
    select: { id: true },
  });
}

export async function deletePayment(id: string): Promise<{ id: string }> {
  return prisma.payment.delete({ where: { id }, select: { id: true } });
}
