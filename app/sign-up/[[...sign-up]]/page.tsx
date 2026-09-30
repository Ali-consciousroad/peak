"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-6">
        <SignUp 
          afterSignUpUrl="/onboarding"
          redirectUrl="/onboarding"
          appearance={{
            elements: {
              // Hide Clerk's internal sign-up and sign-in links since we handle these ourselves
              footerActionLink: 'hidden',
              footerAction: 'hidden',
              footer: 'hidden',
            }
          }}
        />
      </div>
    </div>
  );
} 