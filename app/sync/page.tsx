"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export default function SyncPage() {
  const [status, setStatus] = useState<string>("Checking user status...");
  const router = useRouter();
  const { userId } = useAuth();

  useEffect(() => {
    async function checkUser() {
      if (!userId) {
        setStatus("No user found, redirecting to sign-in...");
        setTimeout(() => router.push("/sign-in"), 2000);
        return;
      }

      try {
        // Check if user exists in our database
        const response = await fetch("/api/me");
        
        if (response.ok) {
          const userData = await response.json();
          setStatus(`Welcome back! Role: ${userData.role}`);
          // Redirect based on existing role
          setTimeout(() => {
            if (userData.role === "freelance") {
              router.push("/services");
            } else {
              router.push("/missions");
            }
          }, 2000);
        } else if (response.status === 404) {
          // User doesn't exist in our database, redirect to role selection
          setStatus("New user detected, redirecting to role selection...");
          setTimeout(() => router.push("/role-selection"), 2000);
        } else {
          setStatus("Error checking user status");
        }
      } catch (error) {
        setStatus("Error checking user status");
      }
    }

    checkUser();
  }, [router, userId]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Setting Up Your Account</h1>
        <p className="text-gray-600">{status}</p>
      </div>
    </div>
  );
} 