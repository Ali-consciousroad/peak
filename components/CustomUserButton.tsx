"use client";

import { UserButton as ClerkUserButton } from "@clerk/nextjs";

export default function CustomUserButton() {
  return (
    <ClerkUserButton 
      afterSignOutUrl="/"
      appearance={{
        baseTheme: undefined,
        elements: {
          userButtonBox: "text-gray-900 dark:text-white",
          userButtonTrigger: "text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700",
          userButtonPopoverCard: "bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700",
          userButtonPopoverCardRoot: "bg-white dark:bg-gray-800",
          userButtonPopoverCardHeader: "bg-white dark:bg-gray-800",
          userButtonPopoverCardHeaderTitle: "text-gray-900 dark:text-white font-semibold",
          userButtonPopoverCardHeaderSubtitle: "text-gray-600 dark:text-gray-300",
          userButtonPopoverCardHeaderSecondary: "text-gray-600 dark:text-gray-300",
          userButtonPopoverCardActions: "bg-white dark:bg-gray-800",
          userButtonPopoverActionButton: "text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
        }
      }}
    />
  );
} 