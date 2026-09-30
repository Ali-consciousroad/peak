import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('SIWE Verify Endpoint', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('verifies signature, sets session, clears nonce', async () => {
    const cookieStore: Record<string, any> = {};
    const setMock = vi.fn((name: string, value: string, opts: any) => {
      cookieStore[name] = { value, opts };
    });
    const getMock = vi.fn((name: string) => cookieStore[name]);

    vi.mock('next/headers', () => ({
      cookies: () => ({ set: setMock, get: getMock }),
      headers: () => new Map([['host', 'localhost:3000']]),
    }));

    vi.mock('viem', async () => {
      return { verifyMessage: vi.fn().mockResolvedValue(true) };
    });

    // Seed nonce cookie
    cookieStore['siwe_nonce'] = { value: 'abc123' };

    const { POST } = await import('../app/api/siwe/verify/route');
    const address = '0x0000000000000000000000000000000000000001';
    const body = {
      message: `localhost wants you to sign in with your Ethereum account:\n${address}\n\nSign in to verify your wallet ownership and start using your account.\n\nURI: http://localhost\nVersion: 1\nChain ID: 43114\nNonce: abc123\nIssued At: ${new Date().toISOString()}`,
      signature: '0xdeadbeef',
      address,
      chainId: 43114,
    };
    const req = new Request('http://localhost/api/siwe/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    // siwe_session set, nonce cleared
    expect(setMock).toHaveBeenCalledWith('siwe_session', expect.any(String), expect.any(Object));
    expect(setMock).toHaveBeenCalledWith('siwe_nonce', '', expect.any(Object));
  });

  it('rejects invalid message context', async () => {
    const cookieStore: Record<string, any> = {};
    const setMock = vi.fn();
    const getMock = vi.fn((name: string) => cookieStore[name]);

    vi.mock('next/headers', () => ({
      cookies: () => ({ set: setMock, get: getMock }),
      headers: () => new Map([['host', 'localhost:3000']]),
    }));

    vi.mock('viem', async () => ({ verifyMessage: vi.fn().mockResolvedValue(true) }));

    // Seed nonce cookie
    cookieStore['siwe_nonce'] = { value: 'correct' };

    const { POST } = await import('../app/api/siwe/verify/route');
    const body = {
      message: `wrongdomain wants you to sign in\nNonce: wrong`,
      signature: '0xdeadbeef',
      address: '0x1',
      chainId: 43114,
    };
    const req = new Request('http://localhost/api/siwe/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});


