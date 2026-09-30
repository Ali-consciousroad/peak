"use client";

import { SignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function Page() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  
  // Show loading while checking authentication
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render sign-in form if user is authenticated (AuthRedirectHandler will redirect)
  if (userId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-6">
        <SignIn 
          afterSignInUrl="/dashboard"
          appearance={{
            elements: {
              formFieldInput: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400',
              formFieldLabel: 'text-gray-700 dark:text-gray-300',
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
              card: 'bg-white dark:bg-gray-800 shadow-lg',
              headerTitle: 'text-gray-900 dark:text-white',
              headerSubtitle: 'text-gray-600 dark:text-gray-300',
              socialButtonsBlockButton: 'border border-gray-200 dark:border-gray-700',
              footerActionLink: 'hidden',
              footerAction: 'hidden',
              footer: 'hidden',
              formFieldInputRow: 'bg-white dark:bg-gray-800',
              formFieldLabelRow: 'text-gray-700 dark:text-gray-300',
              identityPreviewText: 'text-gray-900 dark:text-white',
              identityPreviewEditButton: 'text-blue-600 dark:text-blue-400',
              formResendCodeLink: 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300',
              dividerLine: 'bg-gray-200 dark:bg-gray-700',
              dividerText: 'text-gray-500 dark:text-gray-400',
            }
          }}
        />
        
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300">
            Don&apos;t have an account?{" "}
            <Link 
              href="/sign-up" 
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 