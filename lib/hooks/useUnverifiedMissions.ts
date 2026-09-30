import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export function useUnverifiedMissions() {
  const [unverifiedCount, setUnverifiedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) {
      setUnverifiedCount(0);
      setLoading(false);
      return;
    }

    const fetchUnverifiedCount = async () => {
      try {
        const response = await fetch('/api/admin/unverified-missions-count');
        if (response.ok) {
          const data = await response.json();
          setUnverifiedCount(data.count || 0);
        } else {
          // If not admin (403) or other error, set to 0 (same as messages hook)
          setUnverifiedCount(0);
        }
      } catch (error) {
        console.error('Error fetching unverified missions count:', error);
        setUnverifiedCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchUnverifiedCount();

    // Poll for new unverified missions every 30 seconds
    const interval = setInterval(fetchUnverifiedCount, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  return { unverifiedCount, loading };
}


