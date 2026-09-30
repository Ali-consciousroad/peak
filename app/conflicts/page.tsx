'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Eye } from 'lucide-react';
import Link from 'next/link';
import ConflictMessaging from '@/components/ConflictMessaging';
import ConflictResolution from '@/components/ConflictResolution';

interface Conflict {
  id: string;
  status: string;
  motive: string;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  users_conflicts_reporterIdTousers?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  contracts: {
    id: string;
    contractTerms: string;
    dailyRate: number;
    startDate: string;
    endDate: string;
    freelancerId: string;
    adminId: string;
    users_contracts_freelancerIdTousers: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    users_contracts_adminIdTousers: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    missions: {
      id: string;
      title: string;
      description: string;
      clientId: string;
      users_missions_clientIdTousers: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
      payments?: Array<{
        id: string;
        amount: number;
        status: string;
      }>;
    };
  };
}

const CONFLICT_STATUSES = [
  { value: 'OPEN', label: 'Open', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'IN_REVIEW', label: 'In Review', color: 'bg-blue-100 text-blue-800' },
  { value: 'RESOLVED', label: 'Resolved', color: 'bg-green-100 text-green-800' },
  { value: 'ARCHIVED', label: 'Archived', color: 'bg-gray-100 text-gray-800' },
  { value: 'ESCALATED', label: 'Escalated', color: 'bg-red-100 text-red-800' }
];

export default function ConflictsPage() {
  const { userId, isLoaded } = useAuth();
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch user data
  useEffect(() => {
    if (userId && isLoaded) {
      fetch('/api/me')
        .then(res => res.json())
        .then(data => {
          setUserData(data);
          setIsAdmin(data.role === 'admin');
        })
        .catch(err => console.error('Error fetching user data:', err));
    }
  }, [userId, isLoaded]);

  // Fetch conflicts
  useEffect(() => {
    if (!isLoaded) {
      return; // Wait for auth to load
    }
    
    if (userId) {
      fetch('/api/conflicts')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setConflicts(data);
          } else {
            setError('Failed to fetch conflicts');
          }
        })
        .catch(err => {
          setError('Error fetching conflicts');
          console.error(err);
        })
        .finally(() => setLoading(false));
    } else {
      // No user, stop loading
      setLoading(false);
    }
  }, [userId, isLoaded]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = CONFLICT_STATUSES.find(s => s.value === status);
    return (
      <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-800'}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const handleStatusUpdate = async (conflictId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/conflicts/${conflictId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus
        }),
      });

      if (response.ok) {
        // Refresh conflicts
        const conflictsResponse = await fetch('/api/conflicts');
        if (conflictsResponse.ok) {
          const updatedConflicts = await conflictsResponse.json();
          setConflicts(updatedConflicts);
        }
      } else {
        console.error('Failed to update conflict status');
      }
    } catch (error) {
      console.error('Error updating conflict status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getOtherPartyName = (conflict: Conflict) => {
    if (!userData || !conflict.contracts) return 'Loading...';
    
    const mission = conflict.contracts.missions;
    const freelancer = conflict.contracts.users_contracts_freelancerIdTousers;
    const client = mission?.users_missions_clientIdTousers;
    
    if (!mission || !freelancer || !client) return 'Loading...';
    
    // If user is the client, show freelancer name
    if (userData.id === client.id) {
      if (freelancer.firstName && freelancer.lastName) {
        return `${freelancer.firstName} ${freelancer.lastName}`;
      }
      return freelancer.firstName || freelancer.email || 'Builder';
    }
    // If user is the freelancer, show client name
    if (userData.id === freelancer.id) {
      if (client.firstName && client.lastName) {
        return `${client.firstName} ${client.lastName}`;
      }
      return client.firstName || client.email || 'Client';
    }
    // If user is admin or not directly involved, show both parties
    return 'Multiple Parties';
  };

  const getOtherPartyRole = (conflict: Conflict) => {
    if (!userData || !conflict.contracts) return 'Loading...';
    
    const mission = conflict.contracts.missions;
    const freelancer = conflict.contracts.users_contracts_freelancerIdTousers;
    const client = mission?.users_missions_clientIdTousers;
    
    if (!mission || !freelancer || !client) return 'Loading...';
    
    if (userData.id === client.id) {
      return 'Builder';
    }
    if (userData.id === freelancer.id) {
      return 'Client';
    }
    // If user is admin or not directly involved
    return 'Admin View';
  };

  // Show loading while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <p>Please sign in to view your conflicts.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading conflicts...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Conflicts</h1>
          <p className="text-gray-600 mt-2">
            View and manage disputes related to your contracts
          </p>
        </div>
        
        <Link href="/contracts">
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            View Contracts
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {conflicts.filter(conflict => conflict.contracts && conflict.contracts.missions).length === 0 ? (
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No conflicts found</h3>
          <p className="text-gray-600 mb-6">
            You don't have any reported conflicts. If you need to report a dispute, 
            you can do so from your contract details page.
          </p>
          <Link href="/contracts">
            <Button>
              <Eye className="h-4 w-4 mr-2" />
              View My Contracts
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {conflicts.filter(conflict => conflict.contracts && conflict.contracts.missions).map((conflict) => (
            <Card key={conflict.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Conflict #{conflict.id.slice(-8)}
                    </CardTitle>
                    <CardDescription>
                      Mission: {conflict.contracts?.missions?.title || 'N/A'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(conflict.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-1">Conflict Description:</h4>
                    <p className="text-gray-600 bg-gray-50 p-3 rounded text-sm">
                      {conflict.motive}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Parties Involved:</strong>
                      <div className="mt-1">
                        <div>• Client: {conflict.contracts?.missions?.users_missions_clientIdTousers?.firstName || ''} {conflict.contracts?.missions?.users_missions_clientIdTousers?.lastName || ''}</div>
                        <div>• Builder: {conflict.contracts?.users_contracts_freelancerIdTousers?.firstName || ''} {conflict.contracts?.users_contracts_freelancerIdTousers?.lastName || ''}</div>
                        <div>• Reported by: <span className="text-blue-600 font-medium">
                          {conflict.users_conflicts_reporterIdTousers ? 
                            `${conflict.users_conflicts_reporterIdTousers.firstName || ''} ${conflict.users_conflicts_reporterIdTousers.lastName || ''}`.trim() || conflict.users_conflicts_reporterIdTousers.email : 
                            'Unknown'
                          }
                        </span></div>
                      </div>
                    </div>
                    <div>
                      <strong>Contract Value:</strong> €{conflict.contracts?.dailyRate || 0}/day
                    </div>
                    <div>
                      <strong>Started:</strong> {formatDate(conflict.startDate)}
                    </div>
                    <div>
                      <strong>Last Updated:</strong> {formatDate(conflict.updatedAt)}
                    </div>
                  </div>

                  {conflict.endDate && (
                    <div className="text-sm">
                      <strong>Resolved:</strong> {formatDate(conflict.endDate)}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Link href={`/contracts/${conflict.contracts?.id || ''}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Contract
                        </Button>
                      </Link>
                      <Link href={`/missions/${conflict.contracts?.missions?.id || ''}`}>
                        <Button variant="outline" size="sm">
                          View Mission
                        </Button>
                      </Link>
                    </div>
                    
                    {/* Admin Status Update */}
                    {isAdmin && (
                      <div className="pt-4 border-t">
                        <h4 className="font-semibold mb-3 text-gray-900">Conflict Status</h4>
                        <div className="space-y-3">
                          <Select 
                            value={conflict.status} 
                            onValueChange={(newStatus) => {
                              if (newStatus !== conflict.status) {
                                handleStatusUpdate(conflict.id, newStatus);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OPEN">Open</SelectItem>
                              <SelectItem value="IN_REVIEW">In Review</SelectItem>
                              <SelectItem value="RESOLVED">Resolved</SelectItem>
                              <SelectItem value="ESCALATED">Escalated</SelectItem>
                              <SelectItem value="ARCHIVED">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                    
                    {/* Conflict Resolution (for OPEN/IN_REVIEW conflicts) */}
                    {['OPEN', 'IN_REVIEW'].includes(conflict.status) && (
                      <div className="pt-4 border-t">
                        <ConflictResolution
                          conflictId={conflict.id}
                          contractId={conflict.contracts?.id || ''}
                          totalEscrowed={(() => {
                            // Calculate escrowed amount from payments
                            // Milestone structure: 25% kickoff • 50% mid-project • 25% completion
                            // payment.amount is the total payment amount, status indicates how much is released
                            const payments = conflict.contracts?.missions?.payments || [];
                            return payments.reduce((sum: number, payment: any) => {
                              if (payment.status === 'MADE') {
                                // 100% in escrow (nothing released)
                                return sum + Number(payment.amount);
                              } else if (payment.status === 'RELEASED_1') {
                                // 75% remaining in escrow (25% milestone 1 released)
                                return sum + (Number(payment.amount) * 0.75);
                              } else if (payment.status === 'RELEASED_2') {
                                // 25% remaining in escrow (75% total released: 25% milestone 1 + 50% milestone 2)
                                return sum + (Number(payment.amount) * 0.25);
                              }
                              return sum;
                            }, 0);
                          })()}
                          isClient={userData?.id === conflict.contracts?.missions?.users_missions_clientIdTousers?.id}
                          isFreelancer={userData?.id === conflict.contracts?.users_contracts_freelancerIdTousers?.id}
                          isAdmin={isAdmin}
                          onResolutionComplete={() => {
                            // Refresh conflicts after resolution
                            fetch('/api/conflicts')
                              .then(res => res.json())
                              .then(data => {
                                if (Array.isArray(data)) {
                                  setConflicts(data);
                                }
                              })
                              .catch(err => console.error('Error refreshing conflicts:', err));
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Admin Communication */}
                    <div className="pt-2 border-t">
                      <ConflictMessaging
                        conflictId={conflict.id}
                        contractId={conflict.contracts?.id || ''}
                        clientId={conflict.contracts?.missions?.users_missions_clientIdTousers?.id || ''}
                        freelancerId={conflict.contracts?.users_contracts_freelancerIdTousers?.id || ''}
                        adminId={conflict.contracts?.users_contracts_adminIdTousers?.id || ''}
                        currentUserId={userData?.id}
                        isAdmin={isAdmin}
                        conflictStatus={conflict.status}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
