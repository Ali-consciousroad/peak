"use client";

import { useState } from "react";

export default function TestPage() {
  return (
    <div className="w-full max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold text-center mb-8">Test Mission API</h1>
      <div className="space-y-6">
        <div>
          <label htmlFor="missionId" className="block text-sm font-medium text-gray-700 mb-2">
            Enter Mission ID
          </label>
          <input
            id="missionId"
            type="text"
            className="w-full px-4 py-3 text-lg border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Mission ID"
          />
        </div>
        <div className="flex gap-4">
          <button className="flex-1 px-4 py-3 bg-blue-500 text-white text-lg font-medium rounded-lg hover:bg-blue-600">
            Update
          </button>
          <button className="flex-1 px-4 py-3 bg-red-500 text-white text-lg font-medium rounded-lg hover:bg-red-600">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
} 