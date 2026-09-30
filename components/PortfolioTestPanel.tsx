"use client";

import { useState } from "react";

export default function PortfolioTestPanel() {
  const [portfolioId, setPortfolioId] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [createData, setCreateData] = useState({
    projectUrl: "https://example.com",
    name: "Test Portfolio Project",
    description: "This is a test portfolio project created from the test UI",
  });
  const [updateData, setUpdateData] = useState({
    projectUrl: "https://updated-example.com",
    name: "Updated Portfolio Project",
    description: "This portfolio has been updated from the test UI",
  });

  const handleGet = async () => {
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}`);
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(JSON.stringify({ error: "Failed to get portfolio" }, null, 2));
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/portfolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createData),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
      if (data.id) {
        setPortfolioId(data.id);
      }
    } catch (error) {
      setResult(JSON.stringify({ error: "Failed to create portfolio" }, null, 2));
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(JSON.stringify({ error: "Failed to update portfolio" }, null, 2));
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/portfolios/${portfolioId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(JSON.stringify({ error: "Failed to delete portfolio" }, null, 2));
    }
  };

  const handleGetAll = async () => {
    try {
      const res = await fetch("/api/portfolios");
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(JSON.stringify({ error: "Failed to get all portfolios" }, null, 2));
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Portfolio Test Panel</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Portfolio ID:
          </label>
          <input
            type="text"
            value={portfolioId}
            onChange={(e) => setPortfolioId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Enter portfolio ID"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleGetAll}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Get All Portfolios
          </button>
          <button
            onClick={handleGet}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Get Portfolio
          </button>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Create Portfolio</h3>
          <div className="space-y-2">
            <input
              type="url"
              value={createData.projectUrl}
              onChange={(e) => setCreateData({ ...createData, projectUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Project URL"
            />
            <input
              type="text"
              value={createData.name}
              onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Project Name"
            />
            <textarea
              value={createData.description}
              onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Description"
              rows={2}
            />
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Create Portfolio
            </button>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Update Portfolio</h3>
          <div className="space-y-2">
            <input
              type="url"
              value={updateData.projectUrl}
              onChange={(e) => setUpdateData({ ...updateData, projectUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Updated Project URL"
            />
            <input
              type="text"
              value={updateData.name}
              onChange={(e) => setUpdateData({ ...updateData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Updated Project Name"
            />
            <textarea
              value={updateData.description}
              onChange={(e) => setUpdateData({ ...updateData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Updated Description"
              rows={2}
            />
            <button
              onClick={handleUpdate}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Update Portfolio
            </button>
          </div>
        </div>

        <div className="border-t pt-4">
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete Portfolio
          </button>
        </div>

        {result && (
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Result:</h3>
            <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded text-sm overflow-auto max-h-96">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 