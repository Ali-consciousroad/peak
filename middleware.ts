import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isMutationMethod, parseSiweSessionCookie, routeRequiresSiwe, validateSiweSession } from "@/lib/security/siwe";

// Define role-based route permissions
const rolePermissions = {
  admin: {
    pages: ["/admin", "/admin/**", "/test/missions", "/sync", "/missions", "/missions/**", "/services", "/services/**", "/portfolios", "/portfolios/**"],
    api: ["/api/admin/**", "/api/users/**", "/api/missions/**", "/api/services/**", "/api/portfolios/**"],
  },
  support: {
    pages: ["/support", "/support/**", "/test/missions", "/sync", "/missions", "/missions/**"],
    api: ["/api/support/**", "/api/missions/**"],
  },
  client: {
    pages: ["/client", "/client/**", "/sync", "/missions", "/missions/**"],
    api: ["/api/client/**", "/api/missions/**"],
  },
  freelance: {
    pages: ["/freelance", "/freelance/**", "/sync", "/missions", "/missions/**", "/services", "/services/**", "/portfolios", "/portfolios/**"],
    api: ["/api/freelance/**", "/api/missions/**", "/api/services/**", "/api/portfolios/**"],
  },
};

// Helper function to check if a path matches any of the allowed patterns
const isPathAllowed = (path: string, patterns: string[]): boolean => {
  return patterns.some((pattern) => {
    const regexPattern = pattern
      .replace(/\*\*/g, ".*") // Convert ** to .*
      .replace(/\*/g, "[^/]*"); // Convert * to [^/]*
    return new RegExp(`^${regexPattern}$`).test(path);
  });
};

// Helper function to get user role from Clerk metadata
const getUserRole = (auth: { userId?: string; publicMetadata?: { role?: string } }): string | null => {
  if (!auth?.userId) return null;
  return auth.publicMetadata?.role as string || null;
};

// This example protects all routes including api/trpc routes
// Please edit this to allow other routes to be public as needed.
// See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware
export default authMiddleware({
  publicRoutes: [
    "/", 
    "/sign-in", 
    "/sign-up", 
    "/api/categories", 
    "/api/missions",
    "/api/portfolios",
    "/api/skills",
    "/api/categories-skills",
    "/api/siwe/nonce",
    "/api/siwe/verify",
    "/api/siwe/logout",
    "/api/chatbot",
  ],
  afterAuth: (auth, req) => {
    const url = new URL(req.nextUrl);
    const pathname = url.pathname;

    // Only enforce SIWE on sensitive API routes
    const requiresSiwe = routeRequiresSiwe(pathname, req.method);

    if (!requiresSiwe) {
      return NextResponse.next();
    }

    // Read SIWE session cookie
    const siweCookie = req.cookies.get('siwe_session');
    const session = parseSiweSessionCookie(siweCookie?.value);
    const now = Date.now();
    const needsRecent = isMutationMethod(req.method);
    const result = validateSiweSession(session, now, needsRecent);
    if (result.ok) return NextResponse.next();
    if (result.error === 'missing') return NextResponse.json({ error: 'Wallet verification required' }, { status: 401 });
    if (result.error === 'expired') return NextResponse.json({ error: 'Wallet session expired' }, { status: 401 });
    return NextResponse.json({ error: 'Recent wallet re-sign required' }, { status: 401 });
  },
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
