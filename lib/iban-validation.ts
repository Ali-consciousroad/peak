import IBAN = require('iban');

export type IbanValidationResult =
  | { ok: true; electronic: string }
  | { ok: false; message: string };

/**
 * Validates IBAN structure per ISO 13616 (country rules + mod-97 checksum).
 * Does not prove the account exists at the bank.
 */
export function validateIban(raw: string): IbanValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: 'IBAN is required' };
  }
  const electronic = IBAN.electronicFormat(trimmed);
  if (electronic.length < 15) {
    return {
      ok: false,
      message: 'IBAN is too short. Use your full international IBAN.'
    };
  }
  if (!IBAN.isValid(electronic)) {
    return {
      ok: false,
      message:
        'This IBAN is not valid (wrong country, length, or check digits). Check the number and try again.'
    };
  }
  return { ok: true, electronic };
}
