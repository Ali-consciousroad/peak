'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Euro, Clock, CheckCircle, XCircle, AlertTriangle, Bitcoin } from 'lucide-react';
import PaymentForm from '@/components/PaymentForm';

interface Payment {
  id: string | null;
  amount?: number;
  status?: string;
  paymentMethod?: string;
  transactionDate?: string;
  cryptoAmount?: number;
  cryptoCurrency?: string;
  conversionRate?: number;
  cryptoWalletAddress?: string;
  cryptoTransactionHash?: string;
  needsPayment?: boolean;
  missions?: {
    id: string;
    title: string;
    status: string;
    dailyRate?: number;
    timeframe?: number;
    contracts?: {
      users_contracts_freelancerIdTousers?: {
        firstName?: string;
        lastName?: string;
        email: string;
      };
    };
  };
  currencies?: {
    code: string;
  };
}

interface PaymentManagementProps {
  missionId?: string;
}

export default function PaymentManagement({ missionId }: PaymentManagementProps) {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [missionData, setMissionData] = useState<any>(null);

  useEffect(() => {
    fetchPayments();
    if (missionId) {
      fetchMissionData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId]);

  const fetchPayments = async () => {
    try {
      const url = missionId ? `/api/payments?missionId=${missionId}` : '/api/payments';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // API always returns an array now
        setPayments(Array.isArray(data) ? data : []);
        console.log('Fetched payments:', data.length, data);
        
        // If missionId is provided and no payment exists, show payment form
        if (missionId && data.length === 0) {
          setShowPaymentForm(true);
        }
      } else {
        setError('Failed to fetch payments');
      }
    } catch (err) {
      setError('Error fetching payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchMissionData = async () => {
    if (!missionId) return;
    try {
      const response = await fetch(`/api/missions/${missionId}`);
      if (response.ok) {
        const data = await response.json();
        setMissionData(data);
      }
    } catch (err) {
      console.error('Error fetching mission data:', err);
    }
  };

  const handlePaymentSuccess = (paymentData: any) => {
    setShowPaymentForm(false);
    // Refresh payments list
    fetchPayments();
    // Remove missionId from URL
    router.push('/payments');
  };

  const handleReleasePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to release this payment to the freelancer? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/payments/${paymentId}/release`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Payment released successfully!');
        fetchPayments(); // Refresh the list
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to release payment');
      }
    } catch (err) {
      setError('Error releasing payment');
    }
  };

  const handleCancelPayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to cancel this payment? This will refund your money and make the mission available again.')) {
      return;
    }

    try {
      const response = await fetch(`/api/payments/${paymentId}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Payment cancelled successfully!');
        fetchPayments(); // Refresh the list
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to cancel payment');
      }
    } catch (err) {
      setError('Error cancelling payment');
    }
  };

  const getStatusIcon = (status: string, paymentMethod?: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-gray-600" />;
      case 'MADE':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'RELEASED':
      case 'RELEASED_1':
      case 'RELEASED_2':
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'CANCELLED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'COMPLETED':
        if (paymentMethod === 'CONFLICT_REFUND') {
          return <XCircle className="h-4 w-4 text-red-600" />;
        }
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string, paymentMethod?: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Pending Admin Verification</Badge>;
      case 'MADE':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Held in Escrow (Admin Verified)</Badge>;
      case 'RELEASED_1':
        return <Badge variant="outline" className="text-green-600 border-green-600">Milestone 1 Released (25%)</Badge>;
      case 'RELEASED_2':
        return <Badge variant="outline" className="text-green-600 border-green-600">Milestone 2 Released (50%)</Badge>;
      case 'COMPLETED':
        if (paymentMethod === 'CONFLICT_REFUND') {
          return <Badge variant="outline" className="text-red-600 border-red-600">Conflict Refund Completed</Badge>;
        }
        return <Badge variant="outline" className="text-green-600 border-green-600">All Milestones Released (100%)</Badge>;
      case 'RELEASED':
        return <Badge variant="outline" className="text-green-600 border-green-600">Released</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="text-red-600 border-red-600">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFreelancerName = (payment: Payment) => {
    if (payment.missions?.contracts?.users_contracts_freelancerIdTousers) {
      const freelancer = payment.missions.contracts.users_contracts_freelancerIdTousers;
      if (freelancer.firstName && freelancer.lastName) {
        return `${freelancer.firstName} ${freelancer.lastName}`;
      }
      if (freelancer.firstName) {
        return freelancer.firstName;
      }
      return freelancer.email.split('@')[0];
    }
    return 'No freelancer assigned';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p>Loading payments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
        <Button onClick={fetchPayments} className="mt-2" variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  // Show payment form if missionId is provided and no payment exists yet
  if (missionId && showPaymentForm && payments.length === 0) {
    if (!missionData) {
      return (
        <div className="flex items-center justify-center p-8">
          <p>Loading mission details...</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Create Payment</h2>
            <p className="text-gray-600">Make a payment for: {missionData.title}</p>
          </div>
          <Button onClick={() => {
            setShowPaymentForm(false);
            router.push('/payments');
          }} variant="outline">
            Cancel
          </Button>
        </div>
        <PaymentForm
          missionId={missionId}
          missionTitle={missionData.title}
          totalAmount={
            (missionData.contract?.dailyRate 
              ? Number(missionData.contract.dailyRate) 
              : Number(missionData.dailyRate)
            ) * Number(missionData.timeframe)
          }
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={(error) => {
            setError(error);
          }}
        />
      </div>
    );
  }

  if (payments.length === 0 && !missionId) {
    return (
      <div className="text-center p-8">
        <Euro className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Payments Yet</h3>
        <p className="text-gray-600">You haven't made any payments for missions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Payment Management</h2>
        <Button onClick={fetchPayments} variant="outline">
          Refresh
        </Button>
      </div>

      {payments.map((payment) => (
        <Card key={payment.id} className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">{payment.missions?.title || 'No title'}</h3>
              <p className="text-gray-600">Freelancer: {getFreelancerName(payment)}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                {payment.status && getStatusIcon(payment.status, payment.paymentMethod)}
                {payment.status && getStatusBadge(payment.status, payment.paymentMethod)}
              </div>
              <div className="text-2xl font-bold">
                <Euro className="h-6 w-6 inline mr-1" />
                {payment.amount ? Number(payment.amount).toFixed(2) : '0.00'} EUR
              </div>
              {payment.currencies && payment.currencies.code !== 'EUR' && (
                <div className="text-sm text-gray-600 mt-1">
                  <span className="text-xs">Payment currency: {payment.currencies.code}</span>
                  <span className="text-xs text-gray-500 ml-1">(conversion at release)</span>
                </div>
              )}
              {payment.cryptoAmount && payment.cryptoCurrency && (
                <div className="text-sm text-gray-600 mt-1">
                  <Bitcoin className="h-4 w-4 inline mr-1" />
                  {Number(payment.cryptoAmount).toFixed(8)} {payment.cryptoCurrency}
                  {payment.conversionRate && (
                    <span className="text-xs text-gray-500 ml-2">
                      (Rate: {Number(payment.conversionRate).toFixed(8)})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <span className="text-gray-500">Transaction Date:</span>
              <p className="font-medium">{payment.transactionDate ? formatDate(payment.transactionDate) : 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Escrow Account:</span>
              <p className="font-medium text-xs">BE68 5390 0754 7034</p>
            </div>
            <div>
              <span className="text-gray-500">Bank:</span>
              <p className="font-medium text-xs">KBC Bank NV</p>
            </div>
            {payment.cryptoTransactionHash && (
              <div className="col-span-2">
                <span className="text-gray-500">Crypto Transaction:</span>
                <p className="font-medium text-xs break-all">
                  {payment.cryptoTransactionHash}
                </p>
              </div>
            )}
          </div>

          {payment.status === 'PENDING' && (
            <div className="pt-4 border-t">
              <div className="mb-3 p-3 bg-orange-50 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-1">Payment Pending Admin Verification</h4>
                <p className="text-orange-800 text-sm">
                  <strong>Waiting for Admin:</strong> Payment is pending admin verification before being moved to escrow
                </p>
                <p className="text-orange-800 text-sm mt-1">
                  <strong>Next Step:</strong> Admin will verify the payment was actually received
                </p>
              </div>
            </div>
          )}

          {payment.status === 'MADE' && (
            <div className="pt-4 border-t">
              <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-1">Payment in Escrow - Ready for Milestone Release</h4>
                <p className="text-blue-800 text-sm">
                  <strong>Admin Verified:</strong> Payment is held in escrow and ready for milestone-based release
                </p>
                <p className="text-blue-800 text-sm mt-1">
                  <strong>Next Step:</strong> Go to the mission page to release milestone payments
                </p>
                <div className="mt-2 p-2 bg-white rounded border">
                  <p className="text-xs text-gray-600">
                    <strong>Milestone Structure:</strong> 25% kickoff • 50% mid-project • 25% completion
                  </p>
                </div>
              </div>
            </div>
          )}

          {payment.status === 'RELEASED_1' && (
            <div className="pt-4 border-t">
              <div className="mb-3 p-3 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-1">Milestone 1 Released (25%)</h4>
                <p className="text-green-800 text-sm">
                  <strong>Status:</strong> First milestone payment has been released to the builder
                </p>
                <p className="text-green-800 text-sm mt-1">
                  <strong>Next Step:</strong> Continue with project development. Release milestone 2 when mid-project deliverables are complete.
                </p>
                <div className="mt-2 p-2 bg-white rounded border">
                  <p className="text-xs text-gray-600">
                    <strong>Remaining Milestones:</strong> 50% mid-project • 25% completion
                  </p>
                </div>
              </div>
            </div>
          )}

          {payment.status === 'RELEASED_2' && (
            <div className="pt-4 border-t">
              <div className="mb-3 p-3 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-1">Milestone 2 Released (50%)</h4>
                <p className="text-green-800 text-sm">
                  <strong>Status:</strong> Second milestone payment has been released to the builder
                </p>
                <p className="text-green-800 text-sm mt-1">
                  <strong>Next Step:</strong> Final milestone (25%) will be released upon project completion.
                </p>
                <div className="mt-2 p-2 bg-white rounded border">
                  <p className="text-xs text-gray-600">
                    <strong>Remaining Milestone:</strong> 25% completion
                  </p>
                </div>
              </div>
            </div>
          )}

          {payment.status === 'COMPLETED' && payment.paymentMethod !== 'CONFLICT_REFUND' && (
            <div className="pt-4 border-t">
              <div className="mb-3 p-3 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-1">All Milestones Released (100%) - Mission Complete</h4>
                <p className="text-green-800 text-sm">
                  <strong>Status:</strong> All milestone payments have been released. The mission is complete.
                </p>
                <p className="text-green-800 text-sm mt-1">
                  <strong>All Payments:</strong> 25% kickoff ✓ • 50% mid-project ✓ • 25% completion ✓
                </p>
              </div>
            </div>
          )}

          {payment.status === 'COMPLETED' && payment.paymentMethod === 'CONFLICT_REFUND' && (
            <div className="pt-4 border-t">
              <div className="mb-3 p-3 bg-red-50 rounded-lg">
                <h4 className="font-medium text-red-900 mb-1">Conflict Refund Completed</h4>
                <p className="text-red-800 text-sm">
                  <strong>Status:</strong> Escrow funds were refunded to the client during conflict resolution.
                </p>
                <p className="text-red-800 text-sm mt-1">
                  <strong>Next Step:</strong> If this mission was reopened with a new freelancer, create/verify a new payment before releasing milestones.
                </p>
              </div>
            </div>
          )}

        </Card>
      ))}
    </div>
  );
}
