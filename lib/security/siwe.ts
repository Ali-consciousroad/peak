export type SiweSession = {
  address: string;
  chainId: number | null;
  iat: number; // issued at (ms)
  exp: number; // expires at (ms)
};

export function routeRequiresSiwe(pathname: string, method?: string): boolean {
  const m = method?.toUpperCase();
  const isMutation = m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
  
  // Contracts: Only require SIWE for mutations (POST, PUT, DELETE), not GET
  if (pathname.startsWith('/api/contracts')) {
    return isMutation;
  }
  
  // Payments: Only require SIWE for crypto-related operations, not for creating EUR payments
  // GET requests (fetching payments) don't need SIWE - user is already authenticated via Clerk
  // POST /api/payments (creating payment) doesn't need SIWE - it's just creating a payment record
  // Milestone releases: SIWE is checked inside the API route only if crypto payment is needed
  // Full payment release: Only require SIWE for full release (not milestone)
  if (pathname.startsWith('/api/payments')) {
    // Only require SIWE for full payment release (not milestone releases)
    // Milestone releases check SIWE inside the route only if crypto is needed
    if (pathname.includes('/release') && !pathname.includes('/release-milestone')) {
      return isMutation;
    }
    // Creating payments (POST /api/payments) doesn't require SIWE - handled in the API route itself
    return false;
  }
  
  // Admin routes: Only require SIWE for mutations, not GET
  // Exclude check-deadlines, skills, categories, reopen, refund - these are database operations, not crypto transactions
  if (pathname.startsWith('/api/admin')) {
    if (pathname.includes('/check-deadlines') || 
        pathname.includes('/skills') || 
        pathname.includes('/categories') ||
        pathname.includes('/reopen') ||
        pathname.includes('/refund')) {
      return false; // These are database operations, not crypto transactions
    }
    return isMutation;
  }
  
  return false;
}

export function isMutationMethod(method: string): boolean {
  const m = method.toUpperCase();
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
}

export function parseSiweSessionCookie(cookieValue?: string): SiweSession | null {
  if (!cookieValue) return null;
  try {
    const parsed = JSON.parse(cookieValue) as SiweSession;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.exp || !parsed.iat || !parsed.address) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function validateSiweSession(
  session: SiweSession | null,
  nowMs: number,
  requireRecent: boolean,
  maxAgeRecentMs = 10 * 60 * 1000,
): { ok: true } | { ok: false; error: 'missing' | 'expired' | 'stale' } {
  if (!session) return { ok: false, error: 'missing' };
  if (nowMs > session.exp) return { ok: false, error: 'expired' };
  if (requireRecent && nowMs - session.iat > maxAgeRecentMs) return { ok: false, error: 'stale' };
  return { ok: true };
}


