import { describe, expect, it } from 'vitest';
import { validateIban } from '../lib/iban-validation';

describe('validateIban', () => {
  it('accepts a known-valid Belgian IBAN (electronic form)', () => {
    const r = validateIban('BE68 5390 0754 7034');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.electronic).toBe('BE68539007547034');
  });

  it('rejects invalid check digits', () => {
    const r = validateIban('BE68539007547035');
    expect(r.ok).toBe(false);
  });

  it('rejects placeholder seed-style values', () => {
    expect(validateIban('FR123456789').ok).toBe(false);
  });

  it('rejects empty', () => {
    const r = validateIban('   ');
    expect(r.ok).toBe(false);
  });
});
