import "./globals.css";
import cx from "classnames";
import { sfPro } from "./fonts";
import Footer from "@/components/layout/footer";
import { Suspense } from "react";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Navbar from "@/components/layout/navbar";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Inter } from "next/font/google";
import ChatbotWidget from "@/components/ChatbotWidget";
import Web3Provider from "@/components/providers/Web3Provider";
import AuthRedirectHandler from "../components/AuthRedirectHandler";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Peak - Freelance Marketplace",
  description: "Connect talented builders with meaningful projects. Building a better future through conscious work.",
  manifest: "/manifest.json",
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export const viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        elements: {
          formFieldInput: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400',
          formFieldLabel: 'text-gray-700 dark:text-gray-300',
          formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
          card: 'bg-white dark:bg-gray-800 shadow-lg',
          headerTitle: 'text-gray-900 dark:text-white',
          headerSubtitle: 'text-gray-600 dark:text-gray-300',
          socialButtonsBlockButton: 'border border-gray-200 dark:border-gray-700',
          footerActionLink: 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300',
          formFieldInputRow: 'bg-white dark:bg-gray-800',
          formFieldLabelRow: 'text-gray-700 dark:text-gray-300',
          identityPreviewText: 'text-gray-900 dark:text-white',
          identityPreviewEditButton: 'text-blue-600 dark:text-blue-400',
          formResendCodeLink: 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300',
          dividerLine: 'bg-gray-200 dark:bg-gray-700',
          dividerText: 'text-gray-500 dark:text-gray-400',
        }
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#000000" />
        </head>
        <body className={`${sfPro.variable} min-h-screen`}>
          <Web3Provider>
            <AuthRedirectHandler />
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
              <Navbar />
              <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
                {children}
              </main>
              <Footer />
              <ChatbotWidget />
              <VercelAnalytics />
              <SpeedInsights />
            </div>
          </Web3Provider>
        </body>
      </html>
    </ClerkProvider>
  );
}
