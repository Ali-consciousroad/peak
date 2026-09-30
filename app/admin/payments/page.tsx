'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Euro, AlertTriangle } from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  status: string;
  paymentMethod: string;
  transactionDate: string;
  currencies?: {
    code: string;
    name: string;
  };
  missions?: {
    id: string;
    title: string;
    users_missions_clientIdTousers?: {
      firstName: string;
      lastName: string;
      email: string;
    };
    contracts?: {
      users_contracts_freelancerIdTousers?: {
        firstName: string;
        lastName: string;
        email: string;
        preferredPaymentMethod?: string;
        cryptoWalletAddress?: string;
      };
    };
  };
  users?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/payments');
      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (paymentId: string) => {
    setProcessing(paymentId);
    try {
      const response = await fetch(`/api/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        await fetchPayments(); // Refresh the list
        alert('Payment verified successfully!');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to verify payment');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      alert('Error verifying payment');
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkPayoutCompleted = async (paymentId: string) => {
    setProcessing(paymentId);
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}/mark-payout-completed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        await fetchPayments();
        alert('Payout marked as completed. Client and builder were notified.');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to mark payout as completed');
      }
    } catch (error) {
      console.error('Error marking payout completed:', error);
      alert('Error marking payout completed');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Pending Verification</Badge>;
      case 'MADE':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Admin Verified</Badge>;
      case 'RELEASED':
        return <Badge variant="outline" className="text-green-600 border-green-600">Released</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="text-red-600 border-red-600">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'MADE':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'RELEASED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'CANCELLED':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading payments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payment Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Verify payments and manage escrow transactions
        </p>
      </div>

      <div className="grid gap-6">
        {payments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">No payments found</p>
            </CardContent>
          </Card>
        ) : (
          payments.filter((payment) => payment.missions).map((payment) => (
            <Card key={payment.id} className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {payment.missions?.title || 'Unknown Mission'}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(payment.status)}
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Amount (Client Payment)</p>
                    <p className="text-lg font-bold text-green-600">
                      <Euro className="h-4 w-4 inline mr-1" />
                      {Number(payment.amount).toFixed(2)} {payment.currencies?.code || 'EUR'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Client</p>
                    {payment.missions?.users_missions_clientIdTousers ? (
                      <>
                    <p className="font-medium">
                          {payment.missions.users_missions_clientIdTousers.firstName} {payment.missions.users_missions_clientIdTousers.lastName}
                    </p>
                        <p className="text-sm text-gray-500">{payment.missions.users_missions_clientIdTousers.email}</p>
                      </>
                    ) : (
                      <p className="text-gray-500">Unknown client</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Builder</p>
                    {payment.missions?.contracts?.users_contracts_freelancerIdTousers ? (
                      <>
                        <p className="font-medium">
                          {payment.missions.contracts.users_contracts_freelancerIdTousers.firstName} {payment.missions.contracts.users_contracts_freelancerIdTousers.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{payment.missions.contracts.users_contracts_freelancerIdTousers.email}</p>
                        {payment.missions.contracts.users_contracts_freelancerIdTousers.preferredPaymentMethod && (
                          <p className="text-xs text-blue-600 mt-1">
                            Preferred payout: {payment.missions.contracts.users_contracts_freelancerIdTousers.preferredPaymentMethod}
                            {payment.missions.contracts.users_contracts_freelancerIdTousers.preferredPaymentMethod !== 'EUR' && payment.missions.contracts.users_contracts_freelancerIdTousers.cryptoWalletAddress && (
                              <span className="text-gray-500 ml-1">(will receive crypto)</span>
                            )}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500">No builder assigned</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Transaction Date</p>
                    <p className="font-medium">{formatDate(payment.transactionDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Payment ID</p>
                    <p className="font-mono text-sm">{payment.id}</p>
                  </div>
                </div>

                {payment.status === 'PENDING' && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-orange-50 rounded-lg flex-1 mr-4">
                        <h4 className="font-medium text-orange-900 mb-1">Payment Verification Required</h4>
                        <p className="text-orange-800 text-sm">
                          Please verify that the payment of <strong>€{Number(payment.amount).toFixed(2)}</strong> has been received in the escrow account before marking as verified.
                        </p>
                        <p className="text-orange-800 text-sm mt-1">
                          <strong>Escrow Account:</strong> BE68 5390 0754 7034 (KBC Bank NV)
                        </p>
                      </div>
                      <Button
                        onClick={() => handleVerifyPayment(payment.id)}
                        disabled={processing === payment.id}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {processing === payment.id ? 'Verifying...' : 'Verify Payment'}
                      </Button>
                    </div>
                  </div>
                )}

                {payment.status === 'MADE' && (
                  <div className="pt-4 border-t">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-1">Payment Admin Verified</h4>
                      <p className="text-blue-800 text-sm">
                        This payment has been verified by admin and is ready for milestone release. The client can now release milestone payments.
                      </p>
                      <p className="text-blue-800 text-sm mt-1">
                        <strong>Escrow Account:</strong> BE68 5390 0754 7034 (KBC Bank NV)
                      </p>
                    </div>
                  </div>
                )}

                {payment.status === 'RELEASED' && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-green-50 rounded-lg flex-1 mr-4">
                        <h4 className="font-medium text-green-900 mb-1">Builder Payout Required</h4>
                        <p className="text-green-800 text-sm">
                          The client released <strong>€{Number(payment.amount).toFixed(2)}</strong>. Transfer this amount to the builder and mark payout as completed.
                        </p>
                      </div>
                      <Button
                        onClick={() => handleMarkPayoutCompleted(payment.id)}
                        disabled={processing === payment.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {processing === payment.id ? 'Updating...' : 'Mark Payout Done'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
