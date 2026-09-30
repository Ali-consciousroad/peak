import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

interface ReceivedOffer {
  id: string;
  status: string;
  dailyRate: number;
  proposalText: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  seenByFreelancerAt: string | null;
  mission: {
    id: string;
    title: string;
    client: {
      id: string;
      firstName?: string;
      lastName?: string;
      email: string;
    };
  };
}

export function useReceivedOffers() {
  const { userId } = useAuth();
  const [offers, setOffers] = useState<ReceivedOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  const fetchOffers = async () => {
    try {
      const response = await fetch('/api/freelancer/received-offers', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOffers(data);
        setCount(data.length);
      } else if (response.status === 403) {
        setOffers([]);
        setCount(0);
      } else {
        setOffers([]);
        setCount(0);
      }
    } catch (error) {
      console.error('[useReceivedOffers] Error:', error);
      setOffers([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setCount(0);
      return;
    }

    fetchOffers();

    const interval = setInterval(fetchOffers, 30000);

    const handleVisibilityChange = () => {
      if (!document.hidden) fetchOffers();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleOffersMarkedAsSeen = () => {
      setTimeout(fetchOffers, 200);
    };
    window.addEventListener('offersMarkedAsSeen', handleOffersMarkedAsSeen);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('offersMarkedAsSeen', handleOffersMarkedAsSeen);
    };
  }, [userId]);

  return { offers, loading, count };
}
