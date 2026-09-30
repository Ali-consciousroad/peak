"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

interface Mission {
  id: string;
  status: string;
  dailyRate: number;
  timeframe: number;
  description: string;
  clientId: string;
  createdAt: string;
  client?: {
    user?: {
      id: string;
    };
  };
}

export default function MissionList() {
  const { userId } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  const [newMission, setNewMission] = useState({
    status: "OPEN",
    dailyRate: 500,
    timeframe: 30,
    description: "",
    clientId: "9e082308-63b5-4e77-b568-02c432fb4890" // Using the client ID from your logs
  });

  const fetchMissions = async () => {
    try {
      const response = await fetch("/api/missions");
      if (!response.ok) {
        throw new Error("Failed to fetch missions");
      }
      const data = await response.json();
      setMissions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch missions");
    } finally {
      setLoading(false);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/me');
      if (response.ok) {
        const userData = await response.json();
        setAdminStatus(userData.role === 'ADMIN');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setAdminStatus(false);
    }
  };

  useEffect(() => {
    fetchMissions();
    checkAdminStatus();
  }, []);

  const isOwner = (mission: Mission) => {
    return userId === mission.client?.user?.id;
  };

  const canEditMission = (mission: Mission) => {
    return isOwner(mission) || adminStatus === true;
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/missions/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete mission");
      }
      setMissions(missions.filter(mission => mission.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete mission");
    }
  };

  const handleUpdate = async (mission: Mission) => {
    try {
      const response = await fetch(`/api/missions/${mission.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mission),
      });
      if (!response.ok) {
        throw new Error("Failed to update mission");
      }
      const updatedMission = await response.json();
      setMissions(missions.map(m => m.id === mission.id ? updatedMission : m));
      setEditingMission(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update mission");
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMission),
      });
      if (!response.ok) {
        throw new Error("Failed to create mission");
      }
      const createdMission = await response.json();
      setMissions([createdMission, ...missions]);
      setShowCreateForm(false);
      setNewMission({
        status: "OPEN",
        dailyRate: 500,
        timeframe: 30,
        description: "",
        clientId: "9e082308-63b5-4e77-b568-02c432fb4890"
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create mission");
    }
  };

  const handleNumberChange = (value: string, field: 'dailyRate' | 'timeframe') => {
    // Remove leading zeros and convert to number
    const numValue = parseInt(value.replace(/^0+/, ''), 10) || 0;
    if (editingMission) {
      setEditingMission({ ...editingMission, [field]: numValue });
    } else {
      setNewMission({ ...newMission, [field]: numValue });
    }
  };

  if (loading) return <div className="text-center py-4">Loading missions...</div>;
  if (error) return <div className="text-red-500 text-center py-4">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Missions</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showCreateForm ? "Cancel" : "Create Mission"}
        </button>
      </div>

      {showCreateForm && (
        <div className="border rounded-lg p-4 bg-white shadow-sm mb-6">
          <div className="space-y-3">
            <select
              value={newMission.status}
              onChange={(e) => setNewMission({ ...newMission, status: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <input
              type="text"
              value={newMission.dailyRate}
              onChange={(e) => handleNumberChange(e.target.value, 'dailyRate')}
              className="w-full p-2 border rounded"
              placeholder="Daily Rate"
              inputMode="numeric"
              pattern="[0-9]*"
            />
            <input
              type="text"
              value={newMission.timeframe}
              onChange={(e) => handleNumberChange(e.target.value, 'timeframe')}
              className="w-full p-2 border rounded"
              placeholder="Timeframe (days)"
              inputMode="numeric"
              pattern="[0-9]*"
            />
            <textarea
              value={newMission.description}
              onChange={(e) => setNewMission({ ...newMission, description: e.target.value })}
              className="w-full p-2 border rounded"
              placeholder="Description"
            />
            <div className="flex space-x-2">
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Create
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {missions.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No missions found</div>
      ) : (
        missions.map((mission) => (
          <div key={mission.id} className="border rounded-lg p-4 bg-white shadow-sm">
            {editingMission?.id === mission.id ? (
              <div className="space-y-3">
                <select
                  value={editingMission.status}
                  onChange={(e) => setEditingMission({ ...editingMission, status: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
                <input
                  type="text"
                  value={editingMission.dailyRate}
                  onChange={(e) => handleNumberChange(e.target.value, 'dailyRate')}
                  className="w-full p-2 border rounded"
                  placeholder="Daily Rate"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                <input
                  type="text"
                  value={editingMission.timeframe}
                  onChange={(e) => handleNumberChange(e.target.value, 'timeframe')}
                  className="w-full p-2 border rounded"
                  placeholder="Timeframe (days)"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
                <textarea
                  value={editingMission.description}
                  onChange={(e) => setEditingMission({ ...editingMission, description: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Description"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleUpdate(editingMission)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingMission(null)}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{mission.description}</h3>
                    <p className="text-sm text-gray-600">
                      Status: {mission.status}
                    </p>
                    <p className="text-sm text-gray-600">
                      Daily Rate: €{mission.dailyRate}
                    </p>
                    <p className="text-sm text-gray-600">
                      Timeframe: {mission.timeframe} days
                    </p>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(mission.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {canEditMission(mission) && (
                      <button
                        onClick={() => setEditingMission(mission)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                      >
                        Edit
                      </button>
                    )}
                    {canEditMission(mission) && (
                      <button
                        onClick={() => handleDelete(mission.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
} 