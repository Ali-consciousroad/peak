'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import ConflictReportDialog from '@/components/ConflictReportDialog';

interface Contract {
  id: string;
  contractTerms: string;
  dailyRate: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  freelancer: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
  admin: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
  mission: {
    id: string;
    title: string;
    description: string;
    dailyRate: string;
    timeframe: number;
    status: string;
    client: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      role: string;
    };
  };
}

export default function ContractDetailsPage() {
  const { userId } = useAuth();
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('UNKNOWN');

  // Fetch user role and data
  useEffect(() => {
    if (userId) {
      fetch('/api/me')
        .then(res => res.json())
        .then(data => {
          setUserData(data);
          if (data.role && data.role.name) {
            setUserRole(data.role.name);
          }
        })
        .catch(err => console.error('Error fetching user role:', err));
    }
  }, [userId]);

  // Fetch contract details
  useEffect(() => {
    if (contractId) {
      fetch(`/api/contracts/${contractId}`)
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setContract(data);
            // Fetch payment status for this contract's mission
            fetchPaymentStatus(data.mission.id);
          } else {
            setError('Contract not found');
          }
        })
        .catch(err => {
          setError('Error fetching contract details');
          console.error(err);
        })
        .finally(() => setLoading(false));
    }
  }, [contractId]);

  // Fetch payment status for the mission
  const fetchPaymentStatus = async (missionId: string) => {
    try {
      const response = await fetch(`/api/payments?missionId=${missionId}`);
      if (response.ok) {
        const payments = await response.json();
        if (payments.length > 0) {
          // Find the original payment (the one with milestone statuses or MADE/PENDING)
          const originalPayment = payments.find((p: any) => 
            ['PENDING', 'MADE', 'RELEASED_1', 'RELEASED_2', 'COMPLETED', 'CANCELLED'].includes(p.status)
          ) || payments[0]; // Fallback to first payment if no original found
          
          setPaymentStatus(originalPayment.status);
        } else {
          setPaymentStatus('NO_PAYMENT');
        }
      }
    } catch (error) {
      console.error('Error fetching payment status:', error);
      setPaymentStatus('ERROR');
    }
  };


  const handleConfirmPayment = async () => {
    if (!contract || !confirm('Confirm that the payment has been received in the escrow account?')) return;

    try {
      // Find the payment for this contract
      const paymentResponse = await fetch(`/api/payments?missionId=${contract.mission.id}`);
      if (!paymentResponse.ok) {
        throw new Error('Failed to fetch payment');
      }
      
      const payments = await paymentResponse.json();
      const payment = payments.find((p: any) => p.status === 'PENDING');
      
      if (!payment) {
        alert('No pending payment found for this contract');
        return;
      }

      // Verify the payment
      const verifyResponse = await fetch(`/api/payments/${payment.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (verifyResponse.ok) {
        alert('Payment confirmed successfully! Status changed to MADE.');
        // Refresh payment status
        if (contract) {
          await fetchPaymentStatus(contract.mission.id);
        }
      } else {
        const errorData = await verifyResponse.json();
        alert(errorData.error || 'Failed to confirm payment');
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Error confirming payment');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getClientName = () => {
    if (!contract) return 'Unknown Client';
    const client = contract.mission.client;
    if (client.firstName && client.lastName) {
      return `${client.firstName} ${client.lastName}`;
    }
    if (client.firstName) {
      return client.firstName;
    }
    // Fallback to email prefix if no name
    if (client.email) {
      return client.email.split('@')[0];
    }
    return 'Unknown Client';
  };

  const calculateDuration = () => {
    if (!contract) return 0;
    const start = new Date(contract.startDate);
    const end = new Date(contract.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const calculateTotalValue = () => {
    if (!contract) return 0;
    const dailyRate = parseFloat(contract.dailyRate);
    const duration = calculateDuration();
    return dailyRate * duration;
  };

  const getPaymentStatusBadge = () => {
    switch (paymentStatus) {
      case 'PENDING':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Payment: Pending</Badge>;
      case 'MADE':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Payment: Made</Badge>;
      case 'RELEASED_1':
        return <Badge variant="outline" className="text-green-600 border-green-600">Payment: Released #1</Badge>;
      case 'RELEASED_2':
        return <Badge variant="outline" className="text-green-600 border-green-600">Payment: Released #2</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="text-green-600 border-green-600">Payment: Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="text-red-600 border-red-600">Payment: Cancelled</Badge>;
      case 'NO_PAYMENT':
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Payment: None</Badge>;
      case 'ERROR':
        return <Badge variant="outline" className="text-red-600 border-red-600">Payment: Error</Badge>;
      default:
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Payment: Unknown</Badge>;
    }
  };

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Please sign in to view contract details.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Loading contract details...</p>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error || 'Contract not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{contract.mission.title || 'Mission Contract'}</h1>
          <p className="text-gray-600">Contract Details</p>
        </div>
        <div className="space-y-2">
          <Badge variant="outline" className={contract.isActive ? "text-green-600 border-green-600" : "text-red-600 border-red-600"}>
            {contract.isActive ? 'Active' : 'Cancelled'}
          </Badge>
          <div>
            {getPaymentStatusBadge()}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Contract Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Contract Information</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Start Date</p>
                <p className="text-lg">{formatDate(contract.startDate)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">End Date</p>
                <p className="text-lg">{formatDate(contract.endDate)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Duration</p>
                <p className="text-lg font-semibold">{calculateDuration()} days</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Daily Rate</p>
                <p className="text-lg font-semibold">€{contract.dailyRate}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Total Value</p>
              <p className="text-2xl font-bold text-green-600">€{calculateTotalValue().toLocaleString()}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Client</p>
              <p className="text-lg">{getClientName()}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Freelancer</p>
              <p className="text-lg">
                {contract.freelancer.firstName && contract.freelancer.lastName
                  ? `${contract.freelancer.firstName} ${contract.freelancer.lastName}`
                  : contract.freelancer.firstName
                  ? contract.freelancer.firstName
                  : contract.freelancer.email?.split('@')[0] || 'Unknown'}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Admin</p>
              <p className="text-lg">
                {contract.admin.firstName && contract.admin.lastName
                  ? `${contract.admin.firstName} ${contract.admin.lastName}`
                  : contract.admin.firstName
                  ? contract.admin.firstName
                  : contract.admin.email?.split('@')[0] || 'Unknown'}
              </p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Created</p>
              <p>{formatDate(contract.createdAt)}</p>
            </div>
          </div>
        </Card>

        {/* Mission Details */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Mission Details</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Title</p>
              <p className="text-lg font-semibold">{contract.mission.title}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <Badge variant="outline">{contract.mission.status}</Badge>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Timeframe</p>
              <p>{contract.mission.timeframe} days</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Description</p>
              <p className="text-gray-700">{contract.mission.description}</p>
            </div>
            
            {/* Skills section removed - not in current schema */}
          </div>
        </Card>
      </div>

      {/* Contract Terms */}
      <Card className="p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">Contract Terms & Payment Milestones</h2>
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Payment Structure</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white rounded border">
                <div>
                  <span className="font-medium">Milestone 1 (25%)</span>
                  <p className="text-sm text-gray-600">Project kickoff and initial deliverables</p>
                </div>
                <span className="font-bold text-green-600">
                  €{(calculateTotalValue() * 0.25).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded border">
                <div>
                  <span className="font-medium">Milestone 2 (50%)</span>
                  <p className="text-sm text-gray-600">Mid-project progress and core functionality</p>
                </div>
                <span className="font-bold text-green-600">
                  €{(calculateTotalValue() * 0.50).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded border">
                <div>
                  <span className="font-medium">Milestone 3 (25%)</span>
                  <p className="text-sm text-gray-600">Final delivery and project completion</p>
                </div>
                <span className="font-bold text-green-600">
                  €{(calculateTotalValue() * 0.25).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-2">Payment Terms</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Payments released upon milestone completion and client approval</li>
              <li>• All payments held securely in escrow until milestone verification</li>
              <li>• Admin verification required before payment release</li>
              <li>• Automatic crypto conversion available for freelancers</li>
            </ul>
          </div>

          {contract.contractTerms && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2">Additional Terms</h3>
              <p className="whitespace-pre-wrap text-gray-700 text-sm">{contract.contractTerms}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Actions */}
      <Card className="p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">Actions</h2>
        
        <div className="flex flex-wrap gap-4">
          <Link href={`/missions/${contract.mission.id}`}>
            <Button variant="outline">View Mission</Button>
          </Link>
          
          {/* Admin payment confirmation button */}
          {userRole === 'admin' && (
            <Button 
              onClick={handleConfirmPayment}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Confirm Payment
            </Button>
          )}
          
          {contract.isActive && (
            <>
              {/* Only client (mission creator) can edit contract */}
              {userData ? (
                userData.id === contract.mission.client.id ? (
                  <Link href={`/contracts/${contract.id}/edit`}>
                    <Button variant="outline">Edit Contract</Button>
                  </Link>
                ) : null
              ) : (
                <div className="text-gray-500 text-sm">Loading permissions...</div>
              )}
              

              
            </>
          )}

          {/* Report Conflict - Available for active contracts */}
          {contract.isActive && (
            <ConflictReportDialog 
              contractId={contract.id}
              contractTitle={contract.mission.description}
            >
              <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Report Conflict
              </Button>
            </ConflictReportDialog>
          )}
          
          <Link href="/contracts">
            <Button variant="outline">Back to Contracts</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}