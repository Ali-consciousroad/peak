"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { CheckCircle, Eye, Clock, User } from "lucide-react";

interface Mission {
  id: string;
  title: string;
  description: string;
  dailyRate: number;
  timeframe: number;
  status: string;
  isVerified: boolean;
  createdAt: string;
  client: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
}

export default function VerifyMissionsPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      router.replace("/sign-in?redirect=/admin/verify-missions");
      return;
    }

    const checkUserRole = async () => {
      try {
        const response = await fetch('/api/me');
        if (response.ok) {
          const userData = await response.json();
          setUserRole(userData.role);
          
          // Redirect if not admin
          if (userData.role !== 'admin') {
            router.replace('/');
            return;
          }
        } else {
          router.replace('/');
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        router.replace('/');
      }
    };

    const fetchUnverifiedMissions = async () => {
      try {
        // Use admin-specific endpoint that shows all missions regardless of status
        const response = await fetch("/api/admin/missions");
        if (!response.ok) {
          throw new Error("Failed to fetch missions");
        }
        const data = await response.json();
        // Filter for unverified missions only
        const unverifiedMissions = data.filter((mission: Mission) => 
          mission.isVerified === false
        );
        setMissions(unverifiedMissions);
      } catch (error) {
        console.error("Error fetching missions:", error);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole().then(() => {
      if (userRole === 'admin') {
        fetchUnverifiedMissions();
      }
    });
  }, [userId, router, userRole]);

  const handleVerifyMission = async (missionId: string) => {
    try {
      const response = await fetch(`/api/missions/${missionId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: true })
      });
      
      if (response.ok) {
        // Remove the mission from the list since it's now verified
        setMissions(missions.filter(m => m.id !== missionId));
        alert('Mission verified successfully!');
      } else {
        alert('Failed to verify mission');
      }
    } catch (error) {
      console.error('Error verifying mission:', error);
      alert('Error verifying mission');
    }
  };

  const getClientName = (mission: Mission) => {
    const client = mission.client;
    if (client.firstName && client.lastName) {
      return `${client.firstName} ${client.lastName}`;
    }
    if (client.firstName) {
      return client.firstName;
    }
    if (client.email) {
      return client.email.split('@')[0];
    }
    return 'Unknown Client';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!userId) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-32">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen pt-32">
        <div className="text-red-500">Access denied. Admin privileges required.</div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full">
      <div className="container mx-auto px-4 py-8 pt-32">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Verify Missions</h1>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {missions.length} pending verification
          </div>
        </div>

        {missions.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No missions pending verification
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              All missions have been verified or there are no new missions to review.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {missions.map((mission) => (
              <div key={mission.id} className="glass-card flex flex-col h-full p-6 shadow-md border border-gray-200 dark:border-gray-700">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {mission.title}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </span>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                    {mission.description}
                  </p>
                  
                  <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <p><strong>Daily Rate:</strong> €{mission.dailyRate}</p>
                    <p><strong>Timeframe:</strong> {mission.timeframe} days</p>
                    <p><strong>Status:</strong> {mission.status}</p>
                    <p><strong>Client:</strong> {getClientName(mission)}</p>
                    <p><strong>Created:</strong> {formatDate(mission.createdAt)}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 flex-1"
                    onClick={() => handleVerifyMission(mission.id)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Verify Mission
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/missions/${mission.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
