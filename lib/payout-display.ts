export type FreelancerPayoutProfile = {
  preferredPaymentMethod?: string | null;
  bankAccount?: string | null;
  cryptoWalletAddress?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

/** True when payouts should use bank (IBAN), not crypto rails. */
export function isEurPreferredPayoutMethod(
  preferredPaymentMethod: string | null | undefined
): boolean {
  const m = (preferredPaymentMethod ?? 'EUR').trim().toUpperCase();
  return m === 'EUR';
}

export function getWeb3PayoutAddress(freelancer: FreelancerPayoutProfile): string {
  return freelancer.cryptoWalletAddress?.trim() || '';
}

/**
 * Human-readable payout routing for admins: only the rails that match preferred method,
 * plus optional EUR IBAN backup when preferred is crypto.
 */
export function formatFreelancerPayoutDetailsForAdmin(
  freelancer: FreelancerPayoutProfile
): string {
  const name =
    [freelancer.firstName, freelancer.lastName].filter(Boolean).join(' ') ||
    freelancer.email ||
    'Freelancer';
  const segments: string[] = [];
  segments.push(`Builder: ${name}`);
  const pref = freelancer.preferredPaymentMethod || 'EUR';
  segments.push(`Preferred: ${pref}`);

  const bank = freelancer.bankAccount?.trim() || '';
  const web3 = getWeb3PayoutAddress(freelancer);

  if (isEurPreferredPayoutMethod(freelancer.preferredPaymentMethod)) {
    if (bank) {
      segments.push(`Bank account (use this for payout): ${bank}`);
    } else {
      segments.push('No IBAN on file—builder prefers EUR; ask them to add an IBAN.');
    }
  } else {
    if (web3) {
      segments.push(`Crypto wallet (${pref}, use this for payout): ${web3}`);
    } else {
      segments.push(
        `No crypto wallet on file—builder prefers ${pref}; ask them to add a wallet address.`
      );
    }
    if (bank) {
      segments.push(`EUR backup (IBAN): ${bank}`);
    }
  }

  return segments.join(' · ');
}
