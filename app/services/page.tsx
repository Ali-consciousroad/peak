"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export default function ServicesPage() {
  const router = useRouter();
  const { userId } = useAuth();

  useEffect(() => {
    // Redirect to skills page since services have been replaced by skills + portfolios
    router.push('/skills');
  }, [router]);

  return (
      <div className="container mx-auto px-4 py-8 pt-24">
      <div className="max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Services</h1>
          <p className="text-gray-600 mb-4">
            Services have been replaced by Skills and Portfolios. Redirecting you to the Skills page...
          </p>
          <p className="text-sm text-gray-500">
            If you are not redirected automatically, <a href="/skills" className="text-blue-600 hover:underline">click here</a>.
          </p>
        </div>
      </div>
    </div>
  );
} 