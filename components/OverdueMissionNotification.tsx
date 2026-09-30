'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface OverdueMission {
  id: string;
  title: string;
  deadline: string;
  gracePeriodEnd: string;
  potentialRefundAmount: number;
  totalPaid: number;
  totalAmount: number;
  client: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  freelancer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  currency: {
    code: string;
    symbol: string;
  };
}

export default function OverdueMissionNotification() {
  const { userId } = useAuth();
  const [missions, setMissions] = useState<OverdueMission[]>([]);
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
            const response = await fetch('/api/admin/overdue-missions');
            if (response.ok) {
              const data = await response.json();
              setMissions(data.slice(0, 3)); // Show max 3 notifications
            }
          }
        }
      } catch (error) {
        console.error('Error fetching overdue mission notifications:', error);
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
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const getClientName = (mission: OverdueMission) => {
    if (mission.client.firstName || mission.client.lastName) {
      return `${mission.client.firstName || ''} ${mission.client.lastName || ''}`.trim();
    }
    return mission.client.email.split('@')[0];
  };

  const getFreelancerName = (mission: OverdueMission) => {
    if (!mission.freelancer) return 'No builder assigned';
    if (mission.freelancer.firstName || mission.freelancer.lastName) {
      return `${mission.freelancer.firstName || ''} ${mission.freelancer.lastName || ''}`.trim();
    }
    return mission.freelancer.email.split('@')[0];
  };

  if (!userId || userRole !== 'admin' || loading) {
    return null;
  }

  if (missions.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No missions currently need refund review.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {missions.map((mission) => (
        <div
          key={mission.id}
          className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <Link
                href={`/missions/${mission.id}`}
                className="font-medium text-orange-900 dark:text-orange-100 hover:underline"
              >
                {mission.title}
              </Link>
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                Client: {getClientName(mission)} • Builder: {getFreelancerName(mission)}
              </p>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-orange-800 dark:text-orange-200">
            <div className="flex justify-between mb-1">
              <span>Grace period ended:</span>
              <span className="font-medium">{formatDate(mission.gracePeriodEnd)}</span>
            </div>
            {mission.potentialRefundAmount > 0 && (
              <div className="flex justify-between mb-1">
                <span>Potential refund:</span>
                <span className="font-medium">
                  {mission.currency.symbol}{mission.potentialRefundAmount.toFixed(2)} {mission.currency.code}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Total paid:</span>
              <span className="font-medium">
                {mission.currency.symbol}{mission.totalPaid.toFixed(2)} {mission.currency.code}
              </span>
            </div>
          </div>
          
          <div className="mt-2 pt-2 border-t border-orange-200 dark:border-orange-800">
            <Link
              href={`/admin/missions/${mission.id}/refund-review`}
              className="text-xs text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-100 font-medium"
            >
              Review refund →
            </Link>
          </div>
        </div>
      ))}
      
      {missions.length >= 3 && (
        <div className="text-center pt-2">
          <Link
            href="/admin/overdue-missions"
            className="text-sm text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-100 font-medium"
          >
            View all overdue missions →
          </Link>
        </div>
      )}
    </div>
  );
}

