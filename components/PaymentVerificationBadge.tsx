'use client';

import { usePendingPayments } from '@/lib/hooks/usePendingPayments';
import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export default function PaymentVerificationBadge() {
  const { userId } = useAuth();
  const { pendingCount, loading } = usePendingPayments();
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

  if (!userId || userRole !== 'admin' || loading || pendingCount === 0) {
    return null;
  }

  return (
    <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1 min-w-[24px] text-center">
      {pendingCount > 99 ? '99+' : pendingCount}
    </span>
  );
}

