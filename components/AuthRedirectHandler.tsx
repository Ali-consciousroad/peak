"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function AuthRedirectHandler() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoaded) return;

    // If user is authenticated and on sign-in or sign-up pages, redirect to dashboard
    if (userId && (pathname === "/sign-in" || pathname === "/sign-up")) {
      console.log("AuthRedirectHandler: Redirecting authenticated user from", pathname, "to dashboard");
      router.replace("/dashboard");
    }
  }, [isLoaded, userId, pathname, router]);

  // This component doesn't render anything
  return null;
}
