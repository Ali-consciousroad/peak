import { describe, it, expect } from 'vitest';
import { isMutationMethod, parseSiweSessionCookie, routeRequiresSiwe, validateSiweSession } from '@/lib/security/siwe';

describe('SIWE enforcement helpers', () => {
  it('routeRequiresSiwe matches protected prefixes', () => {
    expect(routeRequiresSiwe('/api/payments/x')).toBe(true);
    expect(routeRequiresSiwe('/api/contracts/1')).toBe(true);
    expect(routeRequiresSiwe('/api/admin/stats')).toBe(true);
    expect(routeRequiresSiwe('/api/missions')).toBe(false);
  });

  it('isMutationMethod detects mutating HTTP methods', () => {
    expect(isMutationMethod('POST')).toBe(true);
    expect(isMutationMethod('PUT')).toBe(true);
    expect(isMutationMethod('PATCH')).toBe(true);
    expect(isMutationMethod('DELETE')).toBe(true);
    expect(isMutationMethod('GET')).toBe(false);
  });

  it('parseSiweSessionCookie parses valid JSON and rejects invalid', () => {
    expect(parseSiweSessionCookie(undefined)).toBe(null);
    expect(parseSiweSessionCookie('not-json')).toBe(null);
    const good = JSON.stringify({ address: '0x1', chainId: 43114, iat: Date.now(), exp: Date.now() + 1000 });
    expect(parseSiweSessionCookie(good)).toMatchObject({ address: '0x1' });
  });

  it('validateSiweSession enforces missing/expired/stale', () => {
    const now = 1000;
    expect(validateSiweSession(null, now, false)).toEqual({ ok: false, error: 'missing' });
    const expired = { address: '0x1', chainId: 43114, iat: 0, exp: 500 };
    expect(validateSiweSession(expired, now, false)).toEqual({ ok: false, error: 'expired' });
    const stale = { address: '0x1', chainId: 43114, iat: 0, exp: 10_000 };
    expect(validateSiweSession(stale, now + 10 * 60 * 1000 + 1, true).ok).toBe(false);
    const fresh = { address: '0x1', chainId: 43114, iat: now, exp: now + 10_000 };
    expect(validateSiweSession(fresh, now + 100, true)).toEqual({ ok: true });
  });
});


