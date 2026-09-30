import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('SIWE Logout Endpoint', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('clears siwe_session cookie', async () => {
    const setMock = vi.fn();
    vi.mock('next/headers', () => ({
      cookies: () => ({ set: setMock }),
    }));

    const { POST } = await import('../app/api/siwe/logout/route');
    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(setMock).toHaveBeenCalledWith('siwe_session', '', expect.any(Object));
  });
});


