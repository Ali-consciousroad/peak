'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useUnverifiedMissions } from '@/lib/hooks/useUnverifiedMissions';

interface UnverifiedMission {
  id: string;
  title: string;
  createdAt: string;
  client: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export default function MissionVerificationNotification() {
  const { userId } = useAuth();
  const { unverifiedCount, loading: countLoading } = useUnverifiedMissions();
  const [missions, setMissions] = useState<UnverifiedMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Check user role
        const userResponse = await fetch('/api/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserRole(userData.role);
          
          // Only fetch missions if user is admin
          if (userData.role === 'admin') {
            const response = await fetch('/api/admin/missions');
            if (response.ok) {
              const allMissions = await response.json();
              // Filter for unverified missions only
              const unverifiedMissions = allMissions
                .filter((mission: any) => mission.isVerified === false)
                .slice(0, 3); // Show max 3 notifications
              setMissions(unverifiedMissions);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching mission verification notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const getClientName = (mission: UnverifiedMission) => {
    const client = mission.client;
    if (client.firstName && client.lastName) {
      return `${client.firstName} ${client.lastName}`;
    }
    if (client.firstName) {
      return client.firstName;
    }
    return client.email.split('@')[0];
  };

  if (!userId || userRole !== 'admin') {
    return null;
  }

  // Show loading state
  if (loading || countLoading) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Loading unverified missions...
      </div>
    );
  }

  // Show message if no unverified missions
  if (unverifiedCount === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
        No missions pending verification. All missions are verified.
      </div>
    );
  }

  return (
    <div>
      {missions.length > 0 ? (
        missions.map((mission, index) => (
          <div key={mission.id} className={index > 0 ? "mt-3" : ""}>
            <Link href="/admin/verify-missions">
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      {mission.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {getClientName(mission)} • {formatDate(mission.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-100 text-yellow-800">
                    Pending
                  </Badge>
                </div>
              </div>
            </Link>
          </div>
        ))
      ) : (
        // Show a message if count > 0 but missions array is empty (might be loading or error)
        <div className="p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
          <p className="text-sm text-gray-900 dark:text-white">
            {unverifiedCount} mission{unverifiedCount !== 1 ? 's' : ''} pending verification
          </p>
        </div>
      )}
      <Link href="/admin/verify-missions">
        <div className="text-xs text-blue-600 hover:text-blue-800 text-center py-2 mt-3">
          {unverifiedCount > missions.length 
            ? `View all ${unverifiedCount} unverified missions →`
            : 'View all unverified missions →'}
        </div>
      </Link>
    </div>
  );
}

