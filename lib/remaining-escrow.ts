export type EscrowPayment = {
  status: string;
  amount: unknown;
  paymentMethod?: string | null;
};

/**
 * Money still held in escrow (refundable). Same percentages as conflict resolve:
 * MADE 100%, RELEASED_1 75%, RELEASED_2 25%.
 * Milestone RELEASED rows are ignored — they are already paid out to the builder.
 */
export function remainingEscrow(payments: EscrowPayment[]): number {
  return payments.reduce((sum, payment) => {
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount)) return sum;
    if (payment.status === "MADE") return sum + amount;
    if (payment.status === "RELEASED_1") return sum + amount * 0.75;
    if (payment.status === "RELEASED_2") return sum + amount * 0.25;
    return sum;
  }, 0);
}

/** Portion already released to the builder from the original escrow payment. */
export function releasedFromEscrow(payments: EscrowPayment[]): number {
  return payments.reduce((sum, payment) => {
    if (payment.paymentMethod === "MANUAL_REFUND") return sum;
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount)) return sum;
    if (payment.status === "RELEASED_1") return sum + amount * 0.25;
    if (payment.status === "RELEASED_2") return sum + amount * 0.75;
    if (payment.status === "COMPLETED") return sum + amount;
    return sum;
  }, 0);
}
