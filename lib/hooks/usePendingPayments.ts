import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export function usePendingPayments() {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) {
      setPendingCount(0);
      setLoading(false);
      return;
    }

    const fetchPendingCount = async () => {
      try {
        const response = await fetch('/api/admin/pending-payments-count');
        if (response.ok) {
          const data = await response.json();
          setPendingCount(data.count || 0);
        } else {
          // If not admin (403) or other error, set to 0 (same as messages hook)
          setPendingCount(0);
        }
      } catch (error) {
        console.error('Error fetching pending payments count:', error);
        setPendingCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingCount();

    // Poll for new pending payments every 30 seconds
    const interval = setInterval(fetchPendingCount, 30000);

    return () => clearInterval(interval);
  }, [userId]);

  return { pendingCount, loading };
}

