"use client";

import { useState } from "react";

export default function MissionTestPanel() {
  const [missionId, setMissionId] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [updateData, setUpdateData] = useState({
    status: "IN_PROGRESS",
    dailyRate: 600,
    timeframe: 20,
    description: "Updated from test UI",
    categoryIds: [] as string[],
  });

  const handleGet = async () => {
    try {
      const res = await fetch(`/api/missions/${missionId}`);
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(JSON.stringify({ error: "Failed to get mission" }, null, 2));
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch(`/api/missions/${missionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(JSON.stringify({ error: "Failed to update mission" }, null, 2));
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/missions/${missionId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(JSON.stringify({ error: "Failed to delete mission" }, null, 2));
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-16 bg-white p-8 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-8">Test Mission API</h2>
      <div className="space-y-6">
        <div>
          <label htmlFor="missionId" className="block text-sm font-medium text-gray-700 mb-2">
            Enter Mission ID
          </label>
          <input
            id="missionId"
            type="text"
            value={missionId}
            onChange={(e) => setMissionId(e.target.value)}
            className="w-full px-4 py-3 text-lg border-2 border-blue-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Mission ID"
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Update Fields</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={updateData.status}
              onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate</label>
            <input
              type="number"
              value={updateData.dailyRate}
              onChange={(e) => setUpdateData({ ...updateData, dailyRate: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timeframe (days)</label>
            <input
              type="number"
              value={updateData.timeframe}
              onChange={(e) => setUpdateData({ ...updateData, timeframe: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={updateData.description}
              onChange={(e) => setUpdateData({ ...updateData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={handleGet}
            className="flex-1 px-4 py-3 bg-green-500 text-white text-lg font-medium rounded-lg hover:bg-green-600"
          >
            Get
          </button>
          <button 
            onClick={handleUpdate}
            className="flex-1 px-4 py-3 bg-blue-500 text-white text-lg font-medium rounded-lg hover:bg-blue-600"
          >
            Update
          </button>
          <button 
            onClick={handleDelete}
            className="flex-1 px-4 py-3 bg-red-500 text-white text-lg font-medium rounded-lg hover:bg-red-600"
          >
            Delete
          </button>
        </div>

        {result && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">API Response:</h3>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-60 text-sm">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
} 