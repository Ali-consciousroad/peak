"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Euro, CheckCircle, Clock, User as UserIcon } from "lucide-react";

interface PaymentInEscrow {
  contractId: string;
  missionId: string;
  missionTitle: string;
  clientName: string;
  clientEmail: string;
  payment: {
    id: string;
    amount: number;
    status: string;
    transactionDate: string;
    seenByFreelancerAt?: string | null;
    currency: {
      code: string;
      symbol: string;
    };
  };
  dailyRate: number | string;
  startDate: string;
  endDate: string;
}

export default function PaymentsInEscrowPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentInEscrow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      router.replace("/sign-in?redirect=/payments-in-escrow");
      return;
    }

    const fetchData = async () => {
      try {
        // Check user role
        const userResponse = await fetch('/api/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserRole(userData.role);
          
          // Only freelancers can access this page
          if (userData.role !== 'freelance') {
            router.replace('/dashboard');
            return;
          }
        }

        // Fetch payments in escrow
        const response = await fetch('/api/freelancer/payments-in-escrow', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setPayments(data);
          
          // Mark all unseen payments as seen
          if (data.length > 0) {
            const unseenPaymentIds = data
              .filter((payment: PaymentInEscrow) => 
                payment.payment && !payment.payment.seenByFreelancerAt
              )
              .map((payment: PaymentInEscrow) => payment.payment.id);
            
            if (unseenPaymentIds.length > 0) {
              console.log('[Payments in Escrow] Marking', unseenPaymentIds.length, 'payments as seen');
              try {
                const markSeenResponse = await fetch('/api/freelancer/mark-payments-seen', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ paymentIds: unseenPaymentIds })
                });
                if (markSeenResponse.ok) {
                  const result = await markSeenResponse.json();
                  console.log('[Payments in Escrow] Successfully marked payments as seen:', result);
                  // Update local state to reflect seen status
                  setPayments(prev => 
                    prev.map(p => 
                      unseenPaymentIds.includes(p.payment.id)
                        ? { ...p, payment: { ...p.payment, seenByFreelancerAt: new Date().toISOString() } }
                        : p
                    )
                  );
                  // Dispatch event to refresh dashboard count
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('paymentsMarkedAsSeen'));
                    document.dispatchEvent(new Event('visibilitychange'));
                  }, 200);
                } else {
                  const errorText = await markSeenResponse.text();
                  console.error('[Payments in Escrow] Failed to mark payments as seen:', errorText);
                }
              } catch (err) {
                console.error('[Payments in Escrow] Error marking payments as seen:', err);
              }
            }
          }
        } else if (response.status === 403) {
          router.replace('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching payments in escrow:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateTotal = (dailyRate: number | string, startDate: string, endDate: string) => {
    const rate = typeof dailyRate === 'string' ? parseFloat(dailyRate) : dailyRate;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return rate * days;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (userRole !== 'freelance') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24 max-w-6xl">
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold mb-2">Payments in Escrow</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Verified payments still held in escrow for your active missions
        </p>
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Euro className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Payments in Escrow</h3>
            <p className="text-gray-600 dark:text-gray-400">
              When a client pays and an admin verifies it, the payment stays listed here until it is released.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {payments.map((payment) => (
            <Card key={payment.contractId} className="border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 mb-2">
                      {payment.missionTitle}
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Payment Verified
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Contract ID: {payment.contractId.slice(0, 8)}...
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <UserIcon className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">Client</p>
                        <p className="text-gray-600 dark:text-gray-400">{payment.clientName}</p>
                        <p className="text-xs text-gray-500">{payment.clientEmail}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Euro className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">Daily Rate</p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {payment.payment.currency.symbol}{Number(payment.dailyRate).toFixed(2)}/day
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="font-medium">Contract Period</p>
                        <p className="text-gray-600 dark:text-gray-400">
                          {formatDate(payment.startDate)} - {formatDate(payment.endDate)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                        Payment in Escrow
                      </p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {payment.payment.currency.symbol}{Number(payment.payment.amount).toFixed(2)}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Verified on {formatDate(payment.payment.transactionDate)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                    💰 Money is secured in escrow
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    The client has made the payment and it's been verified. You can now start working on this mission with confidence that payment is secured.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    onClick={() => router.push(`/missions/${payment.missionId}`)}
                    variant="outline"
                    className="flex-1"
                  >
                    View Mission Details
                  </Button>
                  <Button 
                    onClick={() => router.push(`/contracts/${payment.contractId}`)}
                    variant="outline"
                    className="flex-1"
                  >
                    View Contract
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

