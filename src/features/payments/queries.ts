import { prisma } from "@/lib/prisma";

export type PaymentRow = {
  id: string;
  amount: number;
  payment_date: Date;
  payment_method: string | null;
  receipt_number: string | null;
  status: string;
};

export async function getPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: { id },
    select: {
      id: true,
      amount: true,
      payment_date: true,
      status: true,
      payment_method: true,
      receipt_number: true,
      case_id: true,
      consultation_id: true,
    },
  });
}

export async function getPaymentRowById(id: string): Promise<PaymentRow | null> {
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return null;

  return {
    id: payment.id,
    amount: Number(payment.amount),
    payment_date: payment.payment_date,
    payment_method: payment.payment_method,
    receipt_number: payment.receipt_number,
    status: payment.status,
  };
}
