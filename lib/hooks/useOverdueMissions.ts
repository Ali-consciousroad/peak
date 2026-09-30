'use client';

import { useState, useEffect } from 'react';

export function useOverdueMissions() {
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch('/api/admin/overdue-missions-count');
        if (response.ok) {
          const data = await response.json();
          setOverdueCount(data.count || 0);
        }
      } catch (error) {
        console.error('Error fetching overdue missions count:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return { overdueCount, loading };
}

