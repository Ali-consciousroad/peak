import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/conversations');
        if (response.ok) {
          const conversations = await response.json();
          const totalUnread = conversations.reduce((sum: number, conv: any) => sum + conv.unreadCount, 0);
          setUnreadCount(totalUnread);
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCount();

    // Poll for new messages every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  return { unreadCount, loading };
}
