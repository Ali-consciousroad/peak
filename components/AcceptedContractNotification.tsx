'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { CheckCircle, User } from 'lucide-react';
import Link from 'next/link';
import { useAcceptedContracts } from '@/lib/hooks/useAcceptedContracts';

interface AcceptedContract {
  id: string;
  createdAt: string;
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

export default function AcceptedContractNotification() {
  const { userId } = useAuth();
  const { contracts, loading } = useAcceptedContracts();
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const getBuilderName = (contract: AcceptedContract) => {
    if (contract.freelancer.firstName || contract.freelancer.lastName) {
      return `${contract.freelancer.firstName || ''} ${contract.freelancer.lastName || ''}`.trim();
    }
    return contract.freelancer.email.split('@')[0];
  };

  if (!userId || userRole !== 'client' || loading) {
    return null;
  }

  if (contracts.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No recently accepted missions.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contracts.slice(0, 3).map((contract) => (
        <Link
          key={contract.id}
          href={`/contracts/${contract.id}`}
        >
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-green-900 dark:text-green-100 text-sm truncate">
                  {contract.mission.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-3 w-3 text-green-700 dark:text-green-300" />
                  <p className="text-xs text-green-700 dark:text-green-300">
                    {getBuilderName(contract)} accepted
                  </p>
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {formatDate(contract.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </Link>
      ))}
      {contracts.length > 3 && (
        <Link href="/contracts">
          <div className="text-xs text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 text-center py-2">
            View all accepted missions ({contracts.length}) →
          </div>
        </Link>
      )}
    </div>
  );
}

