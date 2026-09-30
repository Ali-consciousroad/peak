import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

interface AcceptedContract {
  id: string;
  createdAt: string;
  seenByClientAt: string | null;
  mission: {
    id: string;
    title: string;
    status: string;
  };
  freelancer: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export function useAcceptedContracts() {
  const { userId } = useAuth();
  const [contracts, setContracts] = useState<AcceptedContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setCount(0);
      return;
    }

    const fetchContracts = async () => {
      try {
        console.log('[useAcceptedContracts] Fetching contracts for userId:', userId);
        const response = await fetch('/api/client/accepted-contracts', {
          cache: 'no-store', // Ensure fresh data
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        console.log('[useAcceptedContracts] Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('[useAcceptedContracts] Fetched contracts:', data.length, data);
          console.log('[useAcceptedContracts] Setting count to:', data.length);
          setContracts(data);
          setCount(data.length);
        } else if (response.status === 403) {
          // User is not a client, so no notifications
          console.log('[useAcceptedContracts] User is not a client (403)');
          setContracts([]);
          setCount(0);
        } else {
          // Other error, set to 0
          const errorText = await response.text();
          console.error('[useAcceptedContracts] Error response:', response.status, errorText);
          setContracts([]);
          setCount(0);
        }
      } catch (error) {
        console.error('[useAcceptedContracts] Error fetching accepted contracts:', error);
        // On error, set to 0 to avoid showing stale notifications
        setContracts([]);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchContracts, 30000);
    
    // Also refresh when page becomes visible (user returns from /my-missions)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchContracts();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);

  return { contracts, loading, count };
}

