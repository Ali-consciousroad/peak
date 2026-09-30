'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Bell, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  conflictId: string | null;
  missionId: string | null;
  title: string | null;
  message: string | null;
  readAt: string | null;
  createdAt: string;
}

export default function InAppNotifications() {
  const { userId } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/notifications?limit=10');
        if (response.ok) {
          const data = await response.json();
          setNotifications(data);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getIcon = (type: string, readAt: string | null) => {
    if (type === 'conflict_created') {
      return readAt ? (
        <AlertTriangle className="h-4 w-4 text-gray-500" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-amber-600" />
      );
    }
    return <Bell className="h-4 w-4 text-gray-500" />;
  };

  if (!userId || loading) return null;
  if (notifications.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="text-sm font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </CardTitle>
        <CardDescription>Conflict and activity updates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              href={
                notification.conflictId
                  ? `/conflicts`
                  : notification.missionId
                    ? `/missions/${notification.missionId}`
                    : '/dashboard'
              }
              onClick={() => !notification.readAt && markAsRead(notification.id)}
            >
              <div
                className={`flex items-start gap-3 p-3 border rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  !notification.readAt ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : ''
                }`}
              >
                {getIcon(notification.type, notification.readAt)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {notification.title || 'Notification'}
                  </p>
                  {notification.message && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {formatDate(notification.createdAt)}
                  </p>
                </div>
                {!notification.readAt && (
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </div>
            </Link>
          ))}
        </div>
        <Link
          href="/conflicts"
          className="block text-xs text-blue-600 hover:text-blue-800 text-center py-2 mt-3"
        >
          View all conflicts →
        </Link>
      </CardContent>
    </Card>
  );
}
