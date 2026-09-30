'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle, DollarSign, Users, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ConflictResolutionProps {
  conflictId: string;
  contractId: string;
  totalEscrowed: number;
  isClient: boolean;
  isFreelancer: boolean;
  isAdmin: boolean;
  onResolutionComplete?: () => void;
}

const RESOLUTION_TYPES = [
  {
    id: 'FULL_REFUND',
    label: 'Full Refund to Client',
    description: 'Refund all escrowed funds to the client',
    icon: DollarSign,
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  {
    id: 'FULL_RELEASE',
    label: 'Full Release to Builder',
    description: 'Release all escrowed funds to the builder',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    id: 'PARTIAL_REFUND',
    label: 'Partial Refund',
    description: 'Refund part of funds to client, release rest to builder',
    icon: DollarSign,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50'
  },
  {
    id: 'SPLIT',
    label: 'Split Payment',
    description: 'Custom split between client refund and builder release',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  }
];

export default function ConflictResolution({
  conflictId,
  contractId,
  totalEscrowed,
  isClient,
  isFreelancer,
  isAdmin,
  onResolutionComplete
}: ConflictResolutionProps) {
  const router = useRouter();
  const [resolutionType, setResolutionType] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [releaseAmount, setReleaseAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutualAgreement, setMutualAgreement] = useState(false);

  const handleResolve = async () => {
    if (!resolutionType) {
      setError('Please select a resolution type');
      return;
    }

    if ((resolutionType === 'PARTIAL_REFUND' || resolutionType === 'SPLIT') && !refundAmount) {
      setError('Please specify refund amount');
      return;
    }

    if (resolutionType === 'SPLIT' && !releaseAmount) {
      setError('Please specify release amount');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the resolution');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/conflicts/${conflictId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resolutionType,
          refundAmount: refundAmount ? parseFloat(refundAmount) : undefined,
          releaseAmount: releaseAmount ? parseFloat(releaseAmount) : undefined,
          reason: reason.trim(),
          mutualAgreement
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (onResolutionComplete) {
          onResolutionComplete();
        }
        router.refresh();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to resolve conflict');
      }
    } catch (err) {
      setError('An error occurred while resolving the conflict');
      console.error('Error resolving conflict:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canResolve = isAdmin || (isClient && isFreelancer); // For peer-to-peer, both need to agree

  if (!canResolve) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Resolution Options
          </CardTitle>
          <CardDescription>
            Only admins or both involved parties can resolve conflicts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            {isClient 
              ? 'Contact the builder to reach a mutual agreement, or wait for admin review.'
              : isFreelancer
              ? 'Contact the client to reach a mutual agreement, or wait for admin review.'
              : 'Please contact support if you believe you should have access to resolve this conflict.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          Automated Conflict Resolution
        </CardTitle>
        <CardDescription>
          Resolve this conflict and automatically handle payment distribution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Escrowed Amount Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">Total Escrowed:</span>
            <span className="text-lg font-bold text-blue-900">€{totalEscrowed.toFixed(2)}</span>
          </div>
        </div>

        {/* Resolution Type Selection */}
        <div>
          <Label className="text-base font-semibold mb-3 block">Resolution Type</Label>
          <RadioGroup value={resolutionType} onValueChange={setResolutionType}>
            <div className="space-y-3">
              {RESOLUTION_TYPES.map((type) => {
                const IconComponent = type.icon;
                return (
                  <div key={type.id} className="flex items-start space-x-3">
                    <RadioGroupItem value={type.id} id={type.id} className="mt-1" />
                    <Label
                      htmlFor={type.id}
                      className={`flex-1 p-4 border rounded-lg cursor-pointer transition-colors ${
                        resolutionType === type.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <IconComponent className={`h-5 w-5 ${type.color} mt-0.5`} />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{type.label}</div>
                          <div className="text-sm text-gray-600 mt-1">{type.description}</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                );
              })}
            </div>
          </RadioGroup>
        </div>

        {/* Amount Inputs */}
        {(resolutionType === 'PARTIAL_REFUND' || resolutionType === 'SPLIT') && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="refundAmount">Refund Amount (€)</Label>
              <Input
                id="refundAmount"
                type="number"
                step="0.01"
                min="0"
                max={totalEscrowed}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Amount to refund to client (max: €{totalEscrowed.toFixed(2)})
              </p>
            </div>

            {resolutionType === 'SPLIT' && (
              <div>
                <Label htmlFor="releaseAmount">Release Amount (€)</Label>
                <Input
                  id="releaseAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={totalEscrowed}
                  value={releaseAmount}
                  onChange={(e) => setReleaseAmount(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Amount to release to builder (max: €{totalEscrowed.toFixed(2)})
                </p>
              </div>
            )}

            {refundAmount && releaseAmount && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Total:</strong> €{(parseFloat(refundAmount) + parseFloat(releaseAmount)).toFixed(2)} / €{totalEscrowed.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Reason */}
        <div>
          <Label htmlFor="reason">Resolution Reason *</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain the resolution and why this decision was made..."
            rows={4}
            className="mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">
            This will be recorded for transparency and future reference
          </p>
        </div>

        {/* Mutual Agreement (for peer-to-peer) */}
        {!isAdmin && isClient && isFreelancer && (
          <div className="flex items-start space-x-2">
            <input
              type="checkbox"
              id="mutualAgreement"
              checked={mutualAgreement}
              onChange={(e) => setMutualAgreement(e.target.checked)}
              className="mt-1"
            />
            <Label htmlFor="mutualAgreement" className="text-sm">
              Both parties agree to this resolution (peer-to-peer resolution)
            </Label>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleResolve}
          disabled={isSubmitting || !resolutionType || !reason.trim()}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? 'Resolving...' : 'Resolve Conflict & Process Payments'}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          This will automatically process refunds/releases based on your selection. 
          For crypto payments, funds will be sent automatically via blockchain.
        </p>
      </CardContent>
    </Card>
  );
}
