'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CreditCard, Euro, AlertCircle, CheckCircle } from 'lucide-react';

interface Currency {
  id: string;
  name: string;
  code: string;
  type: string;
}

interface PaymentFormProps {
  missionId: string;
  missionTitle: string;
  totalAmount: number;
  onPaymentSuccess?: (payment: any) => void;
  onPaymentError?: (error: string) => void;
}

export default function PaymentForm({ 
  missionId, 
  missionTitle, 
  totalAmount, 
  onPaymentSuccess, 
  onPaymentError 
}: PaymentFormProps) {
  const [loading, setLoading] = useState(false);
  const [eurCurrencyId, setEurCurrencyId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchEurCurrency = async () => {
      try {
        const response = await fetch('/api/currencies');
        if (response.ok) {
          const data = await response.json();
          // Find EUR currency
          const eurCurrency = data.find((c: Currency) => c.code === 'EUR');
          if (eurCurrency) {
            setEurCurrencyId(eurCurrency.id);
          }
        }
      } catch (err) {
        console.error('Error fetching EUR currency:', err);
      }
    };

    fetchEurCurrency();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate required fields
    if (!missionId) {
      setError('Mission ID is required');
      setLoading(false);
      return;
    }
    if (!eurCurrencyId) {
      setError('EUR currency not found. Please try again.');
      setLoading(false);
      return;
    }
    if (!totalAmount || totalAmount <= 0) {
      setError('Amount must be greater than 0');
      setLoading(false);
      return;
    }

    console.log('Submitting payment:', { missionId, amount: totalAmount, currencyId: eurCurrencyId });

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          missionId,
          amount: totalAmount,
          paymentMethod: 'bank_transfer', // Always bank transfer for manual payments
          currencyId: eurCurrencyId // Always EUR
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Payment created successfully! Your payment is pending admin verification. Escrow Account: BE68 5390 0754 7034');
        onPaymentSuccess?.(data);
      } else {
        setError(data.error || 'Failed to create payment');
        onPaymentError?.(data.error || 'Failed to create payment');
      }
    } catch (err) {
      const errorMessage = 'Error creating payment';
      setError(errorMessage);
      onPaymentError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 max-w-md mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <CreditCard className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-semibold">Secure Payment</h2>
      </div>

      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Mission: {missionTitle}</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-lg font-semibold text-blue-900">
            <Euro className="h-5 w-5" />
            {totalAmount.toFixed(2)} EUR
          </div>
          <p className="text-sm text-blue-700">
            You pay in EUR. The builder will receive payment based on their preferred payment method (EUR or crypto).
          </p>
        </div>
      </div>

      <div className="mb-4 p-3 bg-green-50 rounded-lg">
        <div className="flex items-center gap-2 text-green-800 text-sm">
          <CheckCircle className="h-4 w-4" />
          <span className="font-medium">Escrow Protection</span>
        </div>
        <p className="text-green-700 text-xs mt-1">
          Your payment is held securely until you approve the completed work
        </p>
      </div>

      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Escrow Account Details</h4>
        <div className="text-sm text-blue-800">
          <p><strong>Bank:</strong> KBC Bank NV</p>
          <p><strong>Account:</strong> BE68 5390 0754 7034</p>
          <p><strong>Holder:</strong> Freelance Marketplace Escrow</p>
          <p><strong>BIC:</strong> KREDBEBB</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Error</span>
          </div>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Success</span>
          </div>
          <p className="text-green-600 text-sm mt-1">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Payment Currency:</strong> EUR (Euro)
          </p>
          <p className="text-xs text-gray-600 mt-1">
            All payments are made in EUR. The builder will receive payment in their preferred method (EUR or crypto) when the payment is released.
          </p>
        </div>

        <div className="pt-4">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? 'Processing...' : `Pay ${totalAmount.toFixed(2)} EUR`}
          </Button>
        </div>
      </form>

      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>By proceeding, you agree to our terms of service and payment policy.</p>
        <p>Your payment will be held in escrow until mission completion.</p>
      </div>
    </Card>
  );
}
