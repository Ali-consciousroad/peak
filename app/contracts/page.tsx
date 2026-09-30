'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, FileText, Plus, Euro, CheckCircle } from 'lucide-react';
import Link from 'next/link';

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
    description: string;
    dailyRate: string;
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

export default function ContractsPage() {
  const { userId } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [pendingPayments, setPendingPayments] = useState<Set<string>>(new Set());
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, string>>({});

  const pickPrimaryContractPayment = (payments: any[]) => {
    if (!Array.isArray(payments) || payments.length === 0) return null;
    const active = payments.find((p: any) =>
      ['PENDING', 'MADE', 'RELEASED_1', 'RELEASED_2'].includes(p.status) &&
      p.paymentMethod !== 'CONFLICT_REFUND'
    );
    if (active) return active;
    return payments.find((p: any) =>
      ['COMPLETED', 'CANCELLED'].includes(p.status) &&
      p.paymentMethod !== 'CONFLICT_REFUND'
    ) || null;
  };

  // Fetch user role and data
  useEffect(() => {
    if (userId) {
      fetch('/api/me')
        .then(res => res.json())
        .then(data => {
          setUserData(data);
          if (data.roles && data.roles.length > 0) {
            setUserRole(data.roles[0]); // Get primary role
          }
        })
        .catch(err => console.error('Error fetching user role:', err));
    }
  }, [userId]);

  // Check for pending payments and fetch payment statuses for contracts
  const checkPendingPayments = async (contracts: Contract[]) => {
    const pendingSet = new Set<string>();
    const statusMap: Record<string, string> = {};
    
    for (const contract of contracts) {
      try {
        const response = await fetch(`/api/payments?missionId=${contract.mission.id}`);
        if (response.ok) {
          const payments = await response.json();
          const primaryPayment = pickPrimaryContractPayment(payments);
          if (primaryPayment) {
            statusMap[contract.mission.id] = primaryPayment.status;
            if (primaryPayment.status === 'PENDING') {
              pendingSet.add(contract.mission.id);
            }
          } else {
            statusMap[contract.mission.id] = 'NO_PAYMENT';
          }
        }
      } catch (error) {
        console.error('Error checking payments for mission:', contract.mission.id, error);
        statusMap[contract.mission.id] = 'ERROR';
      }
    }
    
    setPendingPayments(pendingSet);
    setPaymentStatuses(statusMap);
  };

  // Fetch contracts
  useEffect(() => {
    if (userId) {
      console.log('🔍 ContractsPage: Fetching contracts for userId:', userId);
      fetch('/api/contracts')
        .then(res => {
          console.log('🔍 ContractsPage: Response status:', res.status);
          if (!res.ok) {
            return res.json().then(err => {
              console.error('❌ ContractsPage: API error:', err);
              throw new Error(err.error || `HTTP ${res.status}`);
            });
          }
          return res.json();
        })
        .then(data => {
          console.log('🔍 ContractsPage: Received data:', data);
          if (Array.isArray(data)) {
            console.log('✅ ContractsPage: Found', data.length, 'contracts');
            setContracts(data);
            // Check for pending payments after contracts are loaded
            checkPendingPayments(data);
          } else {
            console.error('❌ ContractsPage: Data is not an array:', data);
            setError(data.error || 'Failed to fetch contracts - invalid response format');
          }
        })
        .catch(err => {
          console.error('❌ ContractsPage: Fetch error:', err);
          setError(err.message || 'Error fetching contracts');
        })
        .finally(() => {
          console.log('🔍 ContractsPage: Setting loading to false');
          setLoading(false);
        });
    } else {
      console.log('🔍 ContractsPage: No userId, skipping fetch');
      setLoading(false);
    }
  }, [userId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const calculateTotal = (dailyRate: string, startDate: string, endDate: string) => {
    const rate = parseFloat(dailyRate);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return rate * daysDiff;
  };

  const getClientName = (contract: Contract) => {
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

  const getPaymentStatusBadge = (missionId: string) => {
    const status = paymentStatuses[missionId];
    
    switch (status) {
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

  const handleConfirmPayment = async (missionId: string) => {
    if (!confirm('Confirm that the payment has been received in the escrow account?')) return;

    try {
      // Find the payment for this mission
      const paymentResponse = await fetch(`/api/payments?missionId=${missionId}`);
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
        // Refresh payment statuses instead of full page reload
        await checkPendingPayments(contracts);
      } else {
        const errorData = await verifyResponse.json();
        alert(errorData.error || 'Failed to confirm payment');
      }
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Error confirming payment');
    }
  };

  const handleReleaseMilestone = async (missionId: string, milestone: number) => {
    try {
      // Find the payment for this mission
      const paymentResponse = await fetch(`/api/payments?missionId=${missionId}`);
      if (!paymentResponse.ok) {
        throw new Error('Failed to fetch payment');
      }
      
      const payments = await paymentResponse.json();
      // Pick the active escrow lifecycle payment, not historical conflict settlement rows.
      const payment = payments.find((p: any) =>
        ['PENDING', 'MADE', 'RELEASED_1', 'RELEASED_2'].includes(p.status) &&
        p.paymentMethod !== 'CONFLICT_REFUND'
      ) || payments.find((p: any) =>
        ['COMPLETED', 'CANCELLED'].includes(p.status) &&
        p.paymentMethod !== 'CONFLICT_REFUND'
      );
      
      if (!payment) {
        alert('No payment found for this contract');
        return;
      }

      // Check if payment is in the right status for milestone release
      if (!['MADE', 'RELEASED_1', 'RELEASED_2'].includes(payment.status)) {
        alert(`Payment must be in escrow or milestone status to release milestones. Current status: ${payment.status}`);
        return;
      }

      // Release the milestone
      const releaseResponse = await fetch(`/api/payments/${payment.id}/release-milestone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ milestone })
      });

      if (releaseResponse.ok) {
        const data = await releaseResponse.json();
        alert(data.message);
        // Refresh payment statuses
        await checkPendingPayments(contracts);
      } else {
        const errorData = await releaseResponse.json();
        alert(errorData.error || 'Failed to release milestone');
      }
    } catch (error) {
      console.error('Error releasing milestone:', error);
      alert('Error releasing milestone');
    }
  };

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Please sign in to view your contracts.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Loading contracts...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-full min-w-0 overflow-x-hidden px-4 py-8 pt-24">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold sm:text-3xl">My Contracts</h1>
          <p className="mt-2 break-words text-gray-600">
            {userRole === 'client' ? 'Contracts for projects you hired' : 'Contracts for work you\'re doing'}
          </p>
        </div>
        
        {userRole === 'client' && (
          <Link href="/missions" className="shrink-0">
            <Button className="bg-blue-600 text-white hover:bg-blue-700">
              <FileText className="h-4 w-4 mr-1" />
              View Missions
            </Button>
          </Link>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {contracts.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-600 mb-4">No contracts found</h2>
          <p className="text-gray-500 mb-6">
            {userRole === 'client' 
              ? 'Create a mission and hire builders to get started.' 
              : 'Apply for missions to start working on contracts.'}
          </p>
          {userRole === 'client' && (
            <Link href="/missions/new">
              <Button className="bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1" />
                Create Mission
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid min-w-0 gap-6">
          {contracts.map((contract) => (
            <Card key={contract.id} className="max-w-full min-w-0 overflow-hidden p-4 sm:p-6">
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="mb-2 break-words text-xl font-semibold">{contract.mission.title}</h3>
                  <p className="mb-2 break-words text-gray-600">{contract.mission.description}</p>
                  <p className="text-gray-600">
                    Client: {getClientName(contract)}
                  </p>
                  <p className="text-gray-600">
                    Builder: {contract.freelancer.firstName && contract.freelancer.lastName
                      ? `${contract.freelancer.firstName} ${contract.freelancer.lastName}`
                      : contract.freelancer.firstName
                      ? contract.freelancer.firstName
                      : contract.freelancer.email?.split('@')[0] || 'Unknown'}
                  </p>
                  <p className="text-gray-600">
                    Admin: {contract.admin.firstName && contract.admin.lastName
                      ? `${contract.admin.firstName} ${contract.admin.lastName}`
                      : contract.admin.firstName
                      ? contract.admin.firstName
                      : contract.admin.email?.split('@')[0] || 'Unknown'}
                  </p>
                  <p className="text-gray-600">
                    Daily Rate: €{contract.dailyRate}
                  </p>
                  <p className="text-gray-600 font-semibold">
                    Total: €{calculateTotal(contract.dailyRate, contract.startDate, contract.endDate).toFixed(2)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-row flex-wrap gap-2 sm:flex-col sm:items-end sm:gap-2">
                  <div>
                    <Badge variant="outline" className={
                      contract.mission.status === 'COMPLETED' 
                        ? "text-green-600 border-green-600" 
                        : contract.mission.status === 'IN_PROGRESS'
                        ? "text-blue-600 border-blue-600"
                        : "text-gray-600 border-gray-600"
                    }>
                      {contract.mission.status === 'COMPLETED' ? 'Completed' : 
                       contract.mission.status === 'IN_PROGRESS' ? 'In Progress' : 
                       contract.mission.status}
                    </Badge>
                  </div>
                  <div>
                    {getPaymentStatusBadge(contract.mission.id)}
                  </div>
                </div>
              </div>

              <div className="mb-4 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Start Date</p>
                  <p>{formatDate(contract.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">End Date</p>
                  <p>{formatDate(contract.endDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Duration</p>
                  <p>{Math.ceil((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / (1000 * 3600 * 24))} days</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Amount</p>
                  <p className="font-semibold text-green-600">
                    €{calculateTotal(contract.dailyRate, contract.startDate, contract.endDate).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mb-4 max-w-full overflow-hidden rounded-lg bg-gray-50 p-3 sm:p-4">
                <h4 className="mb-3 text-sm font-medium text-gray-700">Contract Terms & Payment Milestones</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <span className="min-w-0 break-words"><strong>Milestone 1 (25%):</strong> Project kickoff and initial deliverables</span>
                    <span className="shrink-0 font-semibold">€{(calculateTotal(contract.dailyRate, contract.startDate, contract.endDate) * 0.25).toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <span className="min-w-0 break-words"><strong>Milestone 2 (50%):</strong> Mid-project progress and core functionality</span>
                    <span className="shrink-0 font-semibold">€{(calculateTotal(contract.dailyRate, contract.startDate, contract.endDate) * 0.50).toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <span className="min-w-0 break-words"><strong>Milestone 3 (25%):</strong> Final delivery and project completion</span>
                    <span className="shrink-0 font-semibold">€{(calculateTotal(contract.dailyRate, contract.startDate, contract.endDate) * 0.25).toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      <strong>Payment Terms:</strong> Payments released upon milestone completion and client approval. 
                      All payments held securely in escrow until milestone verification.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex min-w-0 flex-wrap gap-2">
                <Link href={`/contracts/${contract.id}`}>
                  <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                </Link>
                
                {/* Admin payment confirmation button - only show if there's a pending payment */}
                {userRole === 'admin' && pendingPayments.has(contract.mission.id) && (
                  <Button 
                    size="sm" 
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={() => handleConfirmPayment(contract.mission.id)}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Confirm Payment
                  </Button>
                )}
                
                {/* Only client (mission creator) can edit contract */}
                {contract.mission.status === 'IN_PROGRESS' && userData && contract.mission.client.id === userData.id && (
                  <Link href={`/contracts/${contract.id}/edit`}>
                    <Button size="sm" className="bg-gray-600 text-white hover:bg-gray-700">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </Link>
                )}
                
                {/* Payment button for clients */}
                {contract.mission.status === 'IN_PROGRESS' &&
                  userData &&
                  contract.mission.client.id === userData.id &&
                  ['NO_PAYMENT', 'CANCELLED', 'ERROR'].includes(paymentStatuses[contract.mission.id] || 'NO_PAYMENT') && (
                  <Link href={`/payments?missionId=${contract.mission.id}`}>
                    <Button size="sm" className="bg-green-600 text-white hover:bg-green-700">
                      <Euro className="h-3 w-3 mr-1" />
                      Make Payment
                    </Button>
                  </Link>
                )}
                
                <Link href={`/missions/${contract.mission.id}`}>
                  <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                    <FileText className="h-3 w-3 mr-1" />
                    View Mission
                  </Button>
                </Link>
              </div>

              {/* Milestone Release Buttons for Clients */}
              {userRole === 'client' && userData && contract.mission.client.id === userData.id && 
               contract.mission.status === 'IN_PROGRESS' &&
               ['MADE', 'RELEASED_1', 'RELEASED_2'].includes(paymentStatuses[contract.mission.id]) && (
                <div className="mt-4 max-w-full overflow-hidden rounded-lg bg-blue-50 p-3 sm:p-4">
                  <h4 className="mb-3 font-medium text-blue-900">Release Milestone Payments</h4>
                  <p className="mb-4 break-words text-sm text-blue-800">
                    Release payments in 3 milestones: 25% kickoff • 50% mid-project • 25% completion
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-3">
                    <Button
                      onClick={() => {
                        if (confirm('Release Milestone 1 (25%) - Project kickoff and initial deliverables?')) {
                          handleReleaseMilestone(contract.mission.id, 1);
                        }
                      }}
                      className={`${paymentStatuses[contract.mission.id] === 'MADE' ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"} whitespace-normal h-auto min-h-8 w-full py-2.5 px-2 leading-tight text-center sm:w-auto`}
                      size="sm"
                      disabled={paymentStatuses[contract.mission.id] !== 'MADE'}
                    >
                      Release Milestone 1<br />
                      <span className="text-xs">€{(calculateTotal(contract.dailyRate, contract.startDate, contract.endDate) * 0.25).toFixed(2)} (25%)</span>
                      {paymentStatuses[contract.mission.id] === 'RELEASED_1' && <span className="text-xs block text-green-600">✓ Released</span>}
                      {paymentStatuses[contract.mission.id] === 'RELEASED_2' && <span className="text-xs block text-green-600">✓ Released</span>}
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm('Release Milestone 2 (50%) - Mid-project progress and core functionality?')) {
                          handleReleaseMilestone(contract.mission.id, 2);
                        }
                      }}
                      className={`${['MADE', 'RELEASED_1'].includes(paymentStatuses[contract.mission.id]) ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"} whitespace-normal h-auto min-h-8 w-full py-2.5 px-2 leading-tight text-center sm:w-auto`}
                      size="sm"
                      disabled={!['MADE', 'RELEASED_1'].includes(paymentStatuses[contract.mission.id])}
                    >
                      Release Milestone 2<br />
                      <span className="text-xs">€{(calculateTotal(contract.dailyRate, contract.startDate, contract.endDate) * 0.50).toFixed(2)} (50%)</span>
                      {paymentStatuses[contract.mission.id] === 'RELEASED_2' && <span className="text-xs block text-green-600">✓ Released</span>}
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm('Release Final Milestone (25%) and Complete Mission? This will mark the project as finished.')) {
                          handleReleaseMilestone(contract.mission.id, 3);
                        }
                      }}
                      className={`${['MADE', 'RELEASED_1', 'RELEASED_2'].includes(paymentStatuses[contract.mission.id]) ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"} whitespace-normal h-auto min-h-8 w-full py-2.5 px-2 leading-tight text-center sm:w-auto`}
                      size="sm"
                      disabled={!['MADE', 'RELEASED_1', 'RELEASED_2'].includes(paymentStatuses[contract.mission.id])}
                    >
                      Release Final Milestone<br />
                      <span className="text-xs">€{(calculateTotal(contract.dailyRate, contract.startDate, contract.endDate) * 0.25).toFixed(2)} (25%)</span>
                      {paymentStatuses[contract.mission.id] === 'COMPLETED' && <span className="text-xs block text-green-600">✓ Released</span>}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}