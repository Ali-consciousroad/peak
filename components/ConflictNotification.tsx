'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

interface ConflictNotification {
  id: string;
  status: string;
  contractId: string;
  missionTitle: string;
  updatedAt: string;
}

export default function ConflictNotification() {
  const { userId } = useAuth();
  const [notifications, setNotifications] = useState<ConflictNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/conflicts');
        if (response.ok) {
          const conflicts = await response.json();
          // Filter for recent updates (last 7 days) and show only OPEN, IN_REVIEW, or RESOLVED
          const recentConflicts = conflicts.filter((conflict: any) => {
            const updatedAt = new Date(conflict.updatedAt);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            return updatedAt > sevenDaysAgo && 
                   ['OPEN', 'IN_REVIEW', 'RESOLVED'].includes(conflict.status);
          });

          setNotifications(recentConflicts.slice(0, 3)); // Show max 3 notifications
        }
      } catch (error) {
        console.error('Error fetching conflict notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'IN_REVIEW':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'RESOLVED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'OPEN': { label: 'Open', color: 'bg-yellow-100 text-yellow-800' },
      'IN_REVIEW': { label: 'In Review', color: 'bg-blue-100 text-blue-800' },
      'RESOLVED': { label: 'Resolved', color: 'bg-green-100 text-green-800' }
    }[status];

    return (
      <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (!userId || loading) {
    return null;
  }

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div>
      {notifications.map((notification, index) => (
        <div key={notification.id} className={index > 0 ? "mt-3" : ""}>
          <Link href="/conflicts">
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <div className="flex items-center gap-3 flex-1">
                {getStatusIcon(notification.status)}
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                    {notification.missionTitle}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Conflict #{notification.id.slice(-8)} • {formatDate(notification.updatedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(notification.status)}
              </div>
            </div>
          </Link>
        </div>
      ))}
      <Link href="/conflicts">
        <div className="text-xs text-blue-600 hover:text-blue-800 text-center py-2 mt-3">
          View all conflicts →
        </div>
      </Link>
    </div>
  );
}
