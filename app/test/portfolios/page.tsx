"use client";

import PortfolioTestPanel from "@/components/PortfolioTestPanel";

export default function TestPortfoliosPage() {
  return (
    <div className="flex-1 w-full">
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Portfolio Testing
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test the portfolio CRUD operations using the panel below.
          </p>
        </div>
        
        <PortfolioTestPanel />
      </div>
    </div>
  );
} 