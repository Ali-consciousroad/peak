import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as nonceGET } from '../app/api/siwe/nonce/route';

describe('SIWE Nonce Endpoint', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('issues a nonce cookie and returns nonce + domain', async () => {
    const setMock = vi.fn();
    vi.mock('next/headers', () => ({
      cookies: () => ({ set: setMock }),
      headers: () => new Map([['host', 'localhost:3000']]),
    }));

    const { GET } = await import('../app/api/siwe/nonce/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.nonce).toBeTruthy();
    expect(json.domain).toBe('localhost');
    expect(setMock).toHaveBeenCalledWith('siwe_nonce', expect.any(String), expect.any(Object));
  });
});


