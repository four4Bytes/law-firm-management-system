import { cache } from "react";

import type { Payment } from "@/generated/prisma/browser";
import { prisma } from "@/lib/prisma";
import type { PageQuery } from "@/lib/types";

export type PaymentRow = Pick<
  Payment,
  "id" | "payment_date" | "payment_method" | "receipt_number" | "status"
> & {
  amount: number;
};

export interface PaymentPageQuery extends PageQuery {
  caseId?: string;
  consultationId?: string;
}

export const getPaymentsPaginated = cache(
  async ({
    caseId,
    consultationId,
    search = "",
    cursor,
    pageSize = 20,
    sort,
  }: PaymentPageQuery): Promise<{
    rows: PaymentRow[];
    nextCursor: string | null;
  }> => {
    const where: Record<string, unknown> = {};
    if (caseId) where.case_id = caseId;
    if (consultationId) where.consultation_id = consultationId;
    if (search) {
      where.OR = [
        { payment_method: { contains: search, mode: "insensitive" as const } },
        { status: { contains: search, mode: "insensitive" as const } },
        { receipt_number: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const defaultOrderBy = [{ payment_date: "desc" as const }, { id: "asc" as const }];

    const orderBy =
      sort?.column === "amount"
        ? [{ amount: sort.direction }, { id: "asc" as const }]
        : sort?.column === "payment_date"
          ? [{ payment_date: sort.direction }, { id: "asc" as const }]
          : sort?.column === "status"
            ? [{ status: sort.direction }, { id: "asc" as const }]
            : defaultOrderBy;

    const payments = await prisma.payment.findMany({
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      ...(cursor ? { cursor: { id: cursor } } : {}),
      where,
      orderBy,
    });

    const hasMore = payments.length > pageSize;
    if (hasMore) payments.pop();

    const rows: PaymentRow[] = payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      payment_date: p.payment_date,
      payment_method: p.payment_method,
      receipt_number: p.receipt_number,
      status: p.status,
    }));

    return {
      rows,
      nextCursor: hasMore ? payments[payments.length - 1].id : null,
    };
  },
);

export const getPaymentById = cache(async (id: string) => {
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
});

export const getPaymentRowById = cache(async (id: string): Promise<PaymentRow | null> => {
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
});
