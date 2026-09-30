'use client';

import { useUnverifiedMissions } from '@/lib/hooks/useUnverifiedMissions';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export default function MissionVerificationBadge() {
  const { userId } = useAuth();
  const { unverifiedCount, loading } = useUnverifiedMissions();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    
    const checkRole = async () => {
      try {
        const response = await fetch('/api/me');
        if (response.ok) {
          const userData = await response.json();
          setUserRole(userData.role);
        }
      } catch (error) {
        console.error('Error checking role:', error);
      }
    };
    
    checkRole();
  }, [userId]);

  if (!userId || userRole !== 'admin' || loading || unverifiedCount === 0) {
    return null;
  }

  return (
    <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1 min-w-[24px] text-center">
      {unverifiedCount > 99 ? '99+' : unverifiedCount}
    </span>
  );
}



