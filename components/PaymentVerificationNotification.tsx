'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Clock, Euro } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { usePendingPayments } from '@/lib/hooks/usePendingPayments';

interface PendingPayment {
  id: string;
  amount: number;
  transactionDate: string;
  currency: {
    code: string;
    name: string;
  };
  mission: {
    id: string;
    title: string;
    client: {
      firstName?: string;
      lastName?: string;
      email: string;
    };
  };
}

export default function PaymentVerificationNotification() {
  const { userId } = useAuth();
  const { pendingCount, loading: countLoading } = usePendingPayments();
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Check user role
        const userResponse = await fetch('/api/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserRole(userData.role);
          
          // Only fetch payments if user is admin
          if (userData.role === 'admin') {
            const response = await fetch('/api/payments');
            if (response.ok) {
              const allPayments = await response.json();
              // Filter for pending payments only and ensure they have mission data
              const pendingPayments = allPayments
                .filter((payment: any) => payment.status === 'PENDING' && payment.missions)
                .slice(0, 3) // Show max 3 notifications
                .map((payment: any) => {
                  const mission = payment.missions || {};
                  const client = mission.users_missions_clientIdTousers || {};
                  return {
                    id: payment.id,
                    amount: payment.amount,
                    transactionDate: payment.transactionDate,
                    currency: payment.currencies || { code: 'EUR', name: 'Euro' },
                    mission: {
                      id: mission.id || '',
                      title: mission.title || 'Unknown Mission',
                      client: {
                        firstName: client.firstName || null,
                        lastName: client.lastName || null,
                        email: client.email || 'Unknown'
                      }
                    }
                  };
                })
                .filter((payment: any) => payment.mission && payment.mission.title); // Double-check we have valid mission data
              setPayments(pendingPayments);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching payment verification notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
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

  const getClientName = (payment: PendingPayment) => {
    const client = payment.mission.client;
    if (client.firstName && client.lastName) {
      return `${client.firstName} ${client.lastName}`;
    }
    if (client.firstName) {
      return client.firstName;
    }
    return client.email.split('@')[0];
  };

  if (!userId || userRole !== 'admin') {
    return null;
  }

  // Show loading state
  if (loading || countLoading) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Loading pending payments...
      </div>
    );
  }

  // Show message if no pending payments
  if (pendingCount === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
        No payments pending verification. All payments are verified.
      </div>
    );
  }

  return (
    <div>
      {payments.length > 0 ? (
        payments.filter((payment) => payment.mission && payment.mission.title).map((payment, index) => (
          <div key={payment.id} className={index > 0 ? "mt-3" : ""}>
            <Link href="/admin/payments">
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      {payment.mission?.title || 'Unknown Mission'}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {getClientName(payment)} • <Euro className="h-3 w-3 inline" /> {Number(payment.amount).toFixed(2)} {payment.currency?.code || 'EUR'} • {formatDate(payment.transactionDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-100 text-orange-800">
                    Pending
                  </Badge>
                </div>
              </div>
            </Link>
          </div>
        ))
      ) : (
        // Show a message if count > 0 but payments array is empty (might be loading or error)
        <div className="p-3 border rounded-lg bg-orange-50 dark:bg-orange-900/20">
          <p className="text-sm text-gray-900 dark:text-white">
            {pendingCount} payment{pendingCount !== 1 ? 's' : ''} pending verification
          </p>
        </div>
      )}
      <Link href="/admin/payments">
        <div className="text-xs text-blue-600 hover:text-blue-800 text-center py-2 mt-3">
          {pendingCount > payments.length 
            ? `View all ${pendingCount} pending payments →`
            : 'View all pending payments →'}
        </div>
      </Link>
    </div>
  );
}

